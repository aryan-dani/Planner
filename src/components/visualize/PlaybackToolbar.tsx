"use client";

import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { motion } from "framer-motion";
import { PlaybackControls } from "@/lib/visualize/useVisualizerPlayback";
import { GhostAction, PrimaryAction } from "@/components/visualize/LessonChrome";
import { easeOut } from "@/components/visualize/motion";

export interface PlaybackToolbarProps<TState> {
  playback: PlaybackControls<TState>;
  disabled?: boolean;
}

export function PlaybackToolbar<TState>({
  playback,
  disabled = false,
}: PlaybackToolbarProps<TState>) {
  const {
    currentStepIndex,
    totalSteps,
    isPlaying,
    speedMs,
    togglePlay,
    stepForward,
    stepBackward,
    reset,
    jumpToStep,
    setSpeedMs,
  } = playback;

  const isAtStart = currentStepIndex === 0;
  const isAtEnd = totalSteps === 0 || currentStepIndex === totalSteps - 1;
  const locked = disabled || totalSteps === 0;
  const progress =
    totalSteps <= 1 ? 0 : (currentStepIndex / (totalSteps - 1)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="w-full flex flex-col gap-4 select-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        <PrimaryAction onClick={togglePlay} disabled={locked}>
          <span className="inline-flex items-center gap-2">
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isPlaying ? "Pause" : isAtEnd && totalSteps > 0 ? "Replay" : "Play"}
          </span>
        </PrimaryAction>
        <GhostAction onClick={stepBackward} disabled={locked || isAtStart}>
          <span className="inline-flex items-center gap-1.5">
            <StepBack className="w-3.5 h-3.5" />
            Back
          </span>
        </GhostAction>
        <GhostAction onClick={stepForward} disabled={locked || isAtEnd}>
          <span className="inline-flex items-center gap-1.5">
            Next
            <StepForward className="w-3.5 h-3.5" />
          </span>
        </GhostAction>
        <GhostAction onClick={reset} disabled={locked || isAtStart}>
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Start
          </span>
        </GhostAction>
        <span className="ml-auto font-mono text-xs text-muted tabular-nums">
          {totalSteps > 0 ? currentStepIndex + 1 : 0} / {totalSteps}
        </span>
      </div>

      <div className="relative h-7 flex items-center">
        <div className="absolute inset-x-0 h-[3px] bg-border" />
        <motion.div
          className="absolute left-0 h-[3px] bg-foreground"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.22, ease: easeOut }}
        />
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={totalSteps === 0 ? 0 : currentStepIndex}
          onChange={(e) => jumpToStep(Number(e.target.value))}
          disabled={locked || totalSteps <= 1}
          aria-label="Step in the run"
          className="viz-range relative z-10 w-full cursor-pointer disabled:opacity-40"
        />
      </div>

      <div className="flex items-center gap-1 text-xs text-muted">
        <span className="mr-2">Speed</span>
        {(
          [
            { label: "Slow", ms: 500 },
            { label: "Normal", ms: 250 },
            { label: "Fast", ms: 80 },
          ] as const
        ).map((preset) => (
          <button
            type="button"
            key={preset.label}
            onClick={() => setSpeedMs(preset.ms)}
            disabled={disabled}
            className={`min-h-11 px-2.5 relative ${
              speedMs === preset.ms ? "text-foreground" : "hover:text-foreground"
            } disabled:opacity-40`}
          >
            {preset.label}
            {speedMs === preset.ms && (
              <motion.span
                layoutId="viz-speed"
                className="absolute left-2 right-2 -bottom-0.5 h-px bg-foreground"
                transition={{ duration: 0.25, ease: easeOut }}
              />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
