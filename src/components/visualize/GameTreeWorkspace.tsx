"use client";

import { useState } from "react";
import { PlaybackToolbar } from "@/components/visualize/PlaybackToolbar";
import { MetricsPanel } from "@/components/visualize/MetricsPanel";
import { StepExplanation } from "@/components/visualize/StepExplanation";
import { GhostAction, PrimaryAction } from "@/components/visualize/LessonChrome";
import { WorkspaceShell } from "@/components/visualize/WorkspaceShell";
import { GameTreeNode } from "@/components/visualize/GameTreeNode";
import { useVisualizerPlayback } from "@/lib/visualize/useVisualizerPlayback";
import { usePendingPlay } from "@/lib/visualize/usePendingPlay";
import {
  generateDefaultTree,
  generateMinimaxSteps,
  generateRandomTree,
} from "@/lib/visualize/engines/minimax";
import { generateAlphaBetaSteps } from "@/lib/visualize/engines/alphaBeta";
import { TreeNode, TreeState } from "@/lib/visualize/tree";
import { AlgorithmStep } from "@/lib/visualize/types";

const MINIMAX_PSEUDOCODE = [
  { line: 1, code: "1. Visit this node" },
  { line: 2, code: "2. Leaf: keep the printed number" },
  { line: 3, code: "3. MAX starts at −∞" },
  { line: 4, code: "4. MAX keeps the larger child" },
  { line: 5, code: "5. MAX is done" },
  { line: 6, code: "6. MIN starts at +∞" },
  { line: 7, code: "7. MIN keeps the smaller child" },
  { line: 8, code: "8. MIN is done" },
  { line: 9, code: "9. The root number is the game value" },
];

const ALPHA_BETA_PSEUDOCODE = [
  { line: 1, code: "1. Visit with the current score window" },
  { line: 2, code: "2. Leaf: keep the printed number" },
  { line: 3, code: "3. MAX starts at −∞" },
  { line: 4, code: "4. MAX keeps the larger child" },
  { line: 5, code: "5. Raise the low end of the window" },
  { line: 6, code: "6. If the window is empty, skip the rest (X)" },
  { line: 7, code: "7. MAX is done" },
  { line: 8, code: "8. MIN starts at +∞" },
  { line: 9, code: "9. MIN keeps the smaller child" },
  { line: 10, code: "10. Lower the high end of the window" },
  { line: 11, code: "11. If the window is empty, skip the rest (X)" },
  { line: 12, code: "12. MIN is done" },
  { line: 13, code: "13. The root number is the game value" },
];

interface GameTreeWorkspaceProps {
  algorithmId: string;
}

export function GameTreeWorkspace({ algorithmId }: GameTreeWorkspaceProps) {
  const [depth] = useState(3);
  const [initialTree, setInitialTree] = useState<TreeNode>(() =>
    generateDefaultTree(3),
  );
  const [steps, setSteps] = useState<AlgorithmStep<TreeState>[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const playback = useVisualizerPlayback(steps, algorithmId);
  const { setPendingPlay } = usePendingPlay(steps, playback);

  const handleWatch = () => {
    const tree = generateRandomTree(depth);
    setInitialTree(tree);
    const newSteps =
      algorithmId === "alpha-beta"
        ? generateAlphaBetaSteps(tree)
        : generateMinimaxSteps(tree);
    setSteps(newSteps);
    setHasGenerated(true);
    setPendingPlay(true);
  };

  const activeState = playback.currentStep
    ? (playback.currentStep.state as TreeState)
    : null;

  const isAlphaBeta = algorithmId === "alpha-beta";
  const shownTree = activeState ? activeState.tree : initialTree;

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted">
        Filled squares are MAX. Outlined circles-as-boxes are MIN.{" "}
        {isAlphaBeta && activeState
          ? `Current window: low ${activeState.alpha ?? "open"} · high ${activeState.beta ?? "open"}.`
          : "Numbers on leaves are the score if the game ends there."}
      </p>

      <WorkspaceShell
        stageLabel="Game tree"
        hasGenerated={hasGenerated}
        playback={playback}
        happeningIdle="Each highlight is one decision in the tree."
        dock={
          !hasGenerated ? (
            <PrimaryAction flat onClick={handleWatch}>
              Watch it run
            </PrimaryAction>
          ) : (
            <>
              <PlaybackToolbar playback={playback} />
              <GhostAction flat onClick={handleWatch}>
                New random tree
              </GhostAction>
            </>
          )
        }
        metricsContent={
          hasGenerated ? (
            <MetricsPanel
              metrics={playback.currentStep?.metrics ?? null}
              frontierLabel={isAlphaBeta ? "Skipped nodes" : "Open work"}
              pathLabel="Best score so far"
            />
          ) : (
            <p className="text-sm text-muted">Watch it run to see counts.</p>
          )
        }
        stepsContent={
          <StepExplanation
            step={playback.currentStep}
            emptyMessage="Run the tree to highlight a line."
            pseudocode={isAlphaBeta ? ALPHA_BETA_PSEUDOCODE : MINIMAX_PSEUDOCODE}
          />
        }
      >
        <div className="overflow-x-auto overflow-y-hidden py-2">
          <div className="min-w-max flex justify-center px-2">
            <GameTreeNode node={shownTree} activeState={activeState} />
          </div>
        </div>
      </WorkspaceShell>
    </div>
  );
}
