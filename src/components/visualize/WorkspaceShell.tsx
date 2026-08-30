"use client";

import type { ReactNode } from "react";
import {
  HappeningNow,
  Stage,
  StudyFold,
} from "@/components/visualize/LessonChrome";
import type { PlaybackControls } from "@/lib/visualize/useVisualizerPlayback";

export interface WorkspaceShellProps<TState> {
  stageLabel: string;
  hasGenerated: boolean;
  playback: PlaybackControls<TState>;
  happeningIdle: string;
  metricsSummary?: string;
  stepsSummary?: string;
  dock: ReactNode;
  metricsContent: ReactNode;
  stepsContent: ReactNode;
  children: ReactNode;
  dockExtra?: ReactNode;
}

export function WorkspaceDock({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 min-h-[12.5rem] w-full">
      {children}
    </div>
  );
}

export function WorkspaceShell<TState>({
  stageLabel,
  hasGenerated,
  playback,
  happeningIdle,
  metricsSummary = "Counts from this step",
  stepsSummary = "Plain-language steps",
  dock,
  metricsContent,
  stepsContent,
  children,
  dockExtra,
}: WorkspaceShellProps<TState>) {
  return (
    <div className="w-full space-y-6">
      <Stage
        label={stageLabel}
        live={hasGenerated && playback.isPlaying}
        dock={
          <WorkspaceDock>
            {dock}
            <HappeningNow
              text={playback.currentStep?.description ?? null}
              idle={happeningIdle}
            />
            {dockExtra}
          </WorkspaceDock>
        }
      >
        {children}
      </Stage>

      <div>
        <StudyFold summary={metricsSummary}>{metricsContent}</StudyFold>
        <StudyFold summary={stepsSummary}>{stepsContent}</StudyFold>
      </div>
    </div>
  );
}
