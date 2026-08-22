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
import {
  generateDefaultTree,
  generateMinimaxSteps,
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
  const [pendingPlay, setPendingPlay] = useState(false);

  const playback = useVisualizerPlayback(steps, algorithmId);

  const play = playback.play;
  useEffect(() => {
    if (!pendingPlay || steps.length === 0) return;
    play();
    setPendingPlay(false);
  }, [pendingPlay, steps.length, play]);

  const handleWatch = () => {
    const tree = generateDefaultTree(depth);
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

  const TreeNodeComponent = ({ node }: { node: TreeNode }) => {
    const isCurrent = activeState?.currentNodeId === node.id;
    const evaluatedValue = activeState?.evaluatedNodes[node.id];
    const isPruned = activeState?.prunedNodes.includes(node.id) ?? false;

    let displayValue: string | number = "?";
    if (evaluatedValue !== undefined) {
      displayValue = evaluatedValue;
    } else if (node.value !== null) {
      displayValue = node.value;
    }
    if (isPruned) displayValue = "X";

    return (
      <div
        className={`flex flex-col items-center ${isPruned ? "opacity-30" : ""}`}
      >
        <div className="flex flex-col items-center relative">
          <div
            className={`viz-cell flex items-center justify-center w-12 h-12 mb-6 text-sm font-semibold
              ${node.isMaxNode ? "bg-foreground text-background" : "bg-background text-foreground border border-foreground"}
              ${isCurrent ? "viz-cell-current outline outline-2 outline-offset-4 outline-foreground" : ""}
              ${isPruned ? "line-through" : ""}
            `}
            title={node.isMaxNode ? "MAX — wants a high number" : "MIN — wants a low number"}
          >
            {displayValue}
          </div>
          {node.children.length > 0 && (
            <div className="absolute top-11 w-px h-6 bg-border" />
          )}
        </div>

        {node.children.length > 0 && (
          <div className="flex gap-4 sm:gap-8 md:gap-12 relative -mt-px">
            <div className="absolute top-0 left-[25%] right-[25%] h-px bg-border" />
            {node.children.map((child) => (
              <div key={child.id} className="relative pt-6">
                <div className="absolute top-0 left-1/2 w-px h-6 bg-border -translate-x-1/2" />
                <TreeNodeComponent node={child} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

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

      <Stage label="Game tree" live={hasGenerated && playback.isPlaying}>
        <div className="overflow-x-auto py-2">
          <div className="min-w-max flex justify-center px-2">
            <TreeNodeComponent node={shownTree} />
          </div>
        </div>
      </Stage>

      {!hasGenerated ? (
        <PrimaryAction onClick={handleWatch}>Watch it run</PrimaryAction>
      ) : (
        <div className="space-y-6">
          <PlaybackToolbar playback={playback} />
          <HappeningNow
            text={playback.currentStep?.description ?? null}
            idle="Each highlight is one decision in the tree."
          />
          <GhostAction onClick={handleWatch}>New random tree</GhostAction>
        </div>
      )}

      {hasGenerated && (
        <div>
          <StudyFold summary="Counts from this step">
            <MetricsPanel
              metrics={playback.currentStep?.metrics ?? null}
              frontierLabel={isAlphaBeta ? "Skipped nodes" : "Open work"}
              pathLabel="Best score so far"
            />
          </StudyFold>
          <StudyFold summary="Plain-language steps">
            <StepExplanation
              step={playback.currentStep}
              emptyMessage="Run the tree to highlight a line."
              pseudocode={isAlphaBeta ? ALPHA_BETA_PSEUDOCODE : MINIMAX_PSEUDOCODE}
            />
          </StudyFold>
        </div>
      )}
    </div>
  );
}
