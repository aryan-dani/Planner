"use client";

import type { ReactNode } from "react";
import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { PlaybackControls } from "@/lib/visualize/useVisualizerPlayback";
import {
  formatPlaybackSpeed,
  PLAYBACK_SPEED_MAX_MS,
  PLAYBACK_SPEED_MIN_MS,
  PLAYBACK_SPEED_PRESETS,
  PLAYBACK_SPEED_STEP_MS,
  sliderValueToSpeedMs,
  speedFillPercent,
  speedMsToSliderValue,
} from "@/lib/visualize/playbackSpeed";

export interface PlaybackToolbarProps<TState> {
  playback: PlaybackControls<TState>;
  disabled?: boolean;
}

function RangeTrack({
  fillPercent,
  children,
}: {
  fillPercent: number;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-8 w-full items-center">
      <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-border" />
      <div
        className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-foreground/70"
        style={{ width: `${fillPercent}%` }}
      />
      {children}
    </div>
  );
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
  const stepProgress =
    totalSteps <= 1 ? 0 : (currentStepIndex / (totalSteps - 1)) * 100;
  const speedSliderValue = speedMsToSliderValue(speedMs);

  const btnBase =
    "inline-flex items-center justify-center gap-1.5 min-h-9 px-3 rounded-md text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const btnPrimary = `${btnBase} bg-foreground text-background font-medium`;
  const btnGhost = `${btnBase} text-muted hover:text-foreground hover:bg-surface/80`;

  return (
    <div className="w-full max-w-xl mx-auto select-none rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={locked}
          className={btnPrimary}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isPlaying ? "Pause" : isAtEnd && totalSteps > 0 ? "Replay" : "Play"}
        </button>
        <button
          type="button"
          onClick={stepBackward}
          disabled={locked || isAtStart}
          className={btnGhost}
        >
          <StepBack className="w-3.5 h-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={stepForward}
          disabled={locked || isAtEnd}
          className={btnGhost}
        >
          Next
          <StepForward className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={locked || isAtStart}
          className={btnGhost}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Start
        </button>
        <span className="font-mono text-xs text-muted tabular-nums min-w-[4.75rem] text-center">
          {totalSteps > 0 ? currentStepIndex + 1 : 0} / {totalSteps}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted">
          <span>Step</span>
          <span>
            {totalSteps > 0 ? currentStepIndex + 1 : 0} of {totalSteps}
          </span>
        </div>
        <RangeTrack fillPercent={stepProgress}>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={totalSteps === 0 ? 0 : currentStepIndex}
            onChange={(e) => jumpToStep(Number(e.target.value))}
            disabled={locked || totalSteps <= 1}
            aria-label="Step in the run"
            className="viz-range viz-range--raised relative z-10 w-full cursor-pointer disabled:opacity-40"
          />
        </RangeTrack>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
            Speed
          </span>
          <span className="font-mono text-[10px] text-muted tabular-nums">
            {formatPlaybackSpeed(speedMs)} per step
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {PLAYBACK_SPEED_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.label}
              onClick={() => setSpeedMs(preset.ms)}
              disabled={disabled}
              className={`min-h-8 rounded-md px-2.5 text-[10px] font-mono uppercase tracking-wide transition-colors disabled:opacity-40 ${
                speedMs === preset.ms
                  ? "bg-foreground text-background"
                  : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted">
            <span>Super slow</span>
            <span>Fast</span>
          </div>
          <RangeTrack fillPercent={speedFillPercent(speedMs)}>
            <input
              type="range"
              min={PLAYBACK_SPEED_MIN_MS}
              max={PLAYBACK_SPEED_MAX_MS}
              step={PLAYBACK_SPEED_STEP_MS}
              value={speedSliderValue}
              onChange={(e) =>
                setSpeedMs(sliderValueToSpeedMs(Number(e.target.value)))
              }
              disabled={disabled}
              aria-label="Playback speed"
              aria-valuetext={`${formatPlaybackSpeed(speedMs)} per step`}
              className="viz-range viz-range--raised relative z-10 w-full cursor-pointer disabled:opacity-40"
            />
          </RangeTrack>
        </div>
      </div>
    </div>
  );
}
