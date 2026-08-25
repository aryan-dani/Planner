"use client";

import React, { useEffect, useState } from "react";
import { PlaybackToolbar } from "@/components/visualize/PlaybackToolbar";
import { MetricsPanel } from "@/components/visualize/MetricsPanel";
import { StepExplanation } from "@/components/visualize/StepExplanation";
import {
  GhostAction,
  HappeningNow,
  PrimaryAction,
  Stage,
  StudyFold,
} from "@/components/visualize/LessonChrome";
import { useVisualizerPlayback } from "@/lib/visualize/useVisualizerPlayback";
import { generateNQueensSteps } from "@/lib/visualize/engines/nQueens";
import { CspState } from "@/lib/visualize/csp";
import { AlgorithmStep } from "@/lib/visualize/types";

const NQUEENS_PSEUDOCODE = [
  { line: 1, code: "1. Every row starts empty" },
  { line: 2, code: "2. Try each column in this row" },
  { line: 3, code: "3. If another queen attacks, skip that column" },
  { line: 4, code: "4. Place a queen and go to the next row" },
  { line: 5, code: "5. If a later row fails, take this queen back" },
  { line: 6, code: "6. All rows filled means a solution" },
  { line: 7, code: "7. Search finished" },
];

interface CspWorkspaceProps {
  algorithmId: string;
}

export function CspWorkspace({ algorithmId }: CspWorkspaceProps) {
  const [n, setN] = useState(4);
  const [steps, setSteps] = useState<AlgorithmStep<CspState>[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);

  const playback = useVisualizerPlayback(steps, algorithmId);
  const activeState = playback.currentStep?.state ?? null;
  const boardN = activeState?.n ?? n;

  const play = playback.play;
  useEffect(() => {
    if (!pendingPlay || steps.length === 0) return;
    play();
    setPendingPlay(false);
  }, [pendingPlay, steps.length, play]);

  const handleWatch = () => {
    setSteps(generateNQueensSteps(n));
    setHasGenerated(true);
    setPendingPlay(true);
  };

  const handleReset = () => {
    setSteps([]);
    setHasGenerated(false);
    setPendingPlay(false);
    playback.reset();
  };

  const queenAt = (row: number, col: number) =>
    (activeState?.queens[row] ?? -1) === col;

  const isTrying =
    activeState?.currentRow != null &&
    activeState.currentCol != null &&
    activeState.currentRow >= 0;

  const isAttacked = (row: number, col: number) =>
    activeState?.attackingCells.some((c) => c.row === row && c.col === col) ??
    false;

  return (
    <div className="space-y-8">
      {!hasGenerated && (
        <label className="flex items-center gap-3 text-sm text-muted">
          Board size
          <select
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="ui-select ui-select-sm"
          >
            {[4, 5, 6, 7, 8].map((size) => (
              <option key={size} value={size}>
                {size} × {size}
              </option>
            ))}
          </select>
        </label>
      )}

      <Stage
        label="Board"
        live={hasGenerated && playback.isPlaying}
        dock={
          <div className="flex flex-col items-center gap-3 min-h-[12.5rem]">
            {!hasGenerated ? (
              <PrimaryAction flat onClick={handleWatch}>Watch it run</PrimaryAction>
            ) : (
              <>
                <PlaybackToolbar playback={playback} />
                <GhostAction onClick={handleReset}>Change board size</GhostAction>
              </>
            )}
            <HappeningNow
              text={playback.currentStep?.description ?? null}
              idle="Each step is a try, a place, or an undo."
            />
          </div>
        }
      >
        <div
          className="grid gap-px bg-border border border-border w-max max-w-full mx-auto overflow-hidden"
          style={{ gridTemplateColumns: `repeat(${boardN}, minmax(0, 1fr))` }}
          role="grid"
          aria-label={`${boardN} by ${boardN} queens board`}
        >
          {Array.from({ length: boardN * boardN }, (_, index) => {
            const row = Math.floor(index / boardN);
            const col = index % boardN;
            const dark = (row + col) % 2 === 1;
            const tryingHere =
              isTrying &&
              activeState?.currentRow === row &&
              activeState?.currentCol === col;
            const hasQueen = queenAt(row, col);
            const attacked = isAttacked(row, col);
            const conflictHere =
              tryingHere && activeState?.status === "conflict";

            let cell = dark ? "bg-surface" : "bg-background";
            if (attacked) cell = "bg-foreground/10";
            if (tryingHere) cell = "bg-foreground/15";
            if (conflictHere) cell = "bg-foreground/25";
            if (hasQueen) cell = "bg-foreground text-background";

            return (
              <div
                key={`${row}-${col}`}
                role="gridcell"
                className={`viz-cell w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center text-sm ${cell} ${
                  tryingHere ? "viz-cell-current" : ""
                } ${hasQueen ? "viz-cell-path" : ""}`}
              >
                {hasQueen ? "Q" : tryingHere ? (conflictHere ? "×" : "·") : ""}
              </div>
            );
          })}
        </div>
      </Stage>

      <div>
        <StudyFold summary="Counts from this step">
          {hasGenerated ? (
            <MetricsPanel
              metrics={playback.currentStep?.metrics ?? null}
              frontierLabel="Rows still empty"
              pathLabel="Queens placed"
            />
          ) : (
            <p className="text-sm text-muted">Watch it run to see counts.</p>
          )}
        </StudyFold>
        <StudyFold summary="Plain-language steps">
          <StepExplanation
            step={playback.currentStep}
            emptyMessage="Run the solver to highlight a line."
            extra={
              activeState ? (
                <p className="text-sm text-muted mb-3">
                  {activeState.status === "conflict"
                    ? "This square is illegal."
                    : activeState.status === "backtrack"
                      ? "That try failed, so the last queen comes off."
                      : activeState.status === "solution"
                        ? "Every row has a safe queen."
                        : "Still searching."}
                </p>
              ) : null
            }
            pseudocode={NQUEENS_PSEUDOCODE}
          />
        </StudyFold>
      </div>
    </div>
  );
}
