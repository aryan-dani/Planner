"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlgorithmStep } from "@/lib/visualize/types";
import {
  logTelemetryEvent,
  markAlgorithmComplete,
} from "@/lib/visualize/client";

export interface PlaybackControls<TState> {
  currentStep: AlgorithmStep<TState> | null;
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  speedMs: number;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;
  jumpToStep: (index: number) => void;
  setSpeedMs: (speed: number) => void;
}

export function useVisualizerPlayback<TState>(
  steps: AlgorithmStep<TState>[],
  algorithmId: string = "unknown",
): PlaybackControls<TState> {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(250);
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `viz-${Date.now()}`,
  );

  const activeTimeMsRef = useRef(0);
  const isCompletedRef = useRef(false);

  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const logAction = useCallback(
    (action: string) => {
      if (algorithmId !== "unknown") {
        logTelemetryEvent({
          sessionId: sessionIdRef.current,
          algorithmId,
          action,
        }).catch(() => {});
      }
    },
    [algorithmId],
  );

  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
    isCompletedRef.current = false;
    activeTimeMsRef.current = 0;
  }, [steps]);

  const maybeComplete = useCallback(() => {
    if (isCompletedRef.current || algorithmId === "unknown") return;
    if (stepsRef.current.length === 0) return;
    isCompletedRef.current = true;
    markAlgorithmComplete(
      algorithmId,
      Math.floor(activeTimeMsRef.current / 1000),
    ).catch(() => {});
  }, [algorithmId]);

  const stepForward = useCallback(() => {
    logAction("STEP_FORWARD");
    setCurrentStepIndex((prevIndex) => {
      if (prevIndex < stepsRef.current.length - 1) {
        const next = prevIndex + 1;
        if (next >= stepsRef.current.length - 1) {
          maybeComplete();
        }
        return next;
      }
      setIsPlaying(false);
      maybeComplete();
      return prevIndex;
    });
  }, [logAction, maybeComplete]);

  const stepBackward = useCallback(() => {
    logAction("STEP_BACKWARD");
    setCurrentStepIndex((prevIndex) => Math.max(0, prevIndex - 1));
  }, [logAction]);

  const reset = useCallback(() => {
    logAction("RESET");
    setIsPlaying(false);
    setCurrentStepIndex(0);
  }, [logAction]);

  const play = useCallback(() => {
    logAction("PLAY");
    if (stepsRef.current.length === 0) return;
    if (currentStepIndex >= stepsRef.current.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(true);
  }, [currentStepIndex, logAction]);

  const pause = useCallback(() => {
    logAction("PAUSE");
    setIsPlaying(false);
  }, [logAction]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const jumpToStep = useCallback(
    (index: number) => {
      logAction(`JUMP_TO_STEP_${index}`);
      const clampedIndex = Math.max(
        0,
        Math.min(index, stepsRef.current.length - 1),
      );
      if (
        stepsRef.current.length > 0 &&
        clampedIndex === stepsRef.current.length - 1
      ) {
        maybeComplete();
      }
      setCurrentStepIndex(clampedIndex);
    },
    [logAction, maybeComplete],
  );

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      activeTimeMsRef.current += speedMs;

      setCurrentStepIndex((prevIndex) => {
        if (prevIndex >= stepsRef.current.length - 1) {
          setIsPlaying(false);
          maybeComplete();
          return prevIndex;
        }
        const next = prevIndex + 1;
        if (next >= stepsRef.current.length - 1) {
          setIsPlaying(false);
          maybeComplete();
        }
        return next;
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedMs, maybeComplete]);

  const currentStep = steps[currentStepIndex] || null;

  return {
    currentStep,
    currentStepIndex,
    totalSteps: steps.length,
    isPlaying,
    speedMs,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBackward,
    reset,
    jumpToStep,
    setSpeedMs,
  };
}
