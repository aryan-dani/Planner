"use client";

import { useMemo, useState } from "react";
import { PlaybackToolbar } from "@/components/visualize/PlaybackToolbar";
import { StepExplanation } from "@/components/visualize/StepExplanation";
import { MetricsPanel } from "@/components/visualize/MetricsPanel";
import { SearchTreeCanvas } from "@/components/visualize/SearchTreeCanvas";
import { GhostAction, PrimaryAction } from "@/components/visualize/LessonChrome";
import { WorkspaceShell } from "@/components/visualize/WorkspaceShell";
import { HeuristicPicker } from "@/components/visualize/HeuristicPicker";
import {
  createCourseSearchTree,
  createInitialSearchTreeState,
  createRandomSearchTree,
  setSearchTreeGoal,
  TreeHeuristicMode,
  SearchTreeGraph,
  SearchTreeState,
} from "@/lib/visualize/searchTree";
import {
  generateSearchTreeSteps,
  SearchTreeAlgorithmId,
} from "@/lib/visualize/engines/searchTree";
import { useVisualizerPlayback } from "@/lib/visualize/useVisualizerPlayback";
import { usePendingPlay } from "@/lib/visualize/usePendingPlay";
import { AlgorithmStep } from "@/lib/visualize/types";

const TREE_PSEUDOCODE: Record<
  SearchTreeAlgorithmId,
  { line: number; code: string }[]
> = {
  bfs: [
    { line: 1, code: "1. Put Start in a queue" },
    { line: 2, code: "2. Take the oldest node from the queue" },
    { line: 3, code: "3. If it is Goal, walk back along parents. Done." },
    { line: 4, code: "4. Else add its children to the queue" },
    { line: 5, code: "5. Repeat until the queue is empty" },
    { line: 6, code: "6. No Goal means search failed" },
    { line: 7, code: "7. Search finished" },
    { line: 8, code: "8. Search completed" },
  ],
  dfs: [
    { line: 1, code: "1. Put Start on a stack" },
    { line: 2, code: "2. Take the newest node from the stack" },
    { line: 3, code: "3. If it is Goal, walk back along parents" },
    { line: 4, code: "4. Else push unseen children" },
    { line: 5, code: "5. Repeat until the stack is empty" },
    { line: 6, code: "6. No Goal means search failed" },
    { line: 7, code: "7. Search finished" },
    { line: 8, code: "8. Search completed" },
  ],
  ucs: [
    { line: 1, code: "1. Put Start in a priority queue with g = 0" },
    { line: 2, code: "2. Take the node with smallest g so far" },
    { line: 3, code: "3. If it is Goal, that path is cheapest" },
    { line: 4, code: "4. Mark it finished" },
    { line: 5, code: "5. Each child g = parent g + edge cost" },
    { line: 6, code: "6. Insert unseen children by g" },
    { line: 7, code: "7. Repeat until the queue is empty" },
    { line: 8, code: "8. Search completed" },
  ],
  "greedy-bfs": [
    { line: 1, code: "1. Score Start with h(n)" },
    { line: 2, code: "2. Take the node with smallest h(n)" },
    { line: 3, code: "3. If it is Goal, walk back along parents" },
    { line: 4, code: "4. Mark it finished" },
    { line: 5, code: "5. Score each child with h(n)" },
    { line: 6, code: "6. Insert unseen children" },
    { line: 7, code: "7. Repeat until the queue is empty" },
    { line: 8, code: "8. Search completed" },
  ],
  "a-star": [
    { line: 1, code: "1. Score Start as g + h" },
    { line: 2, code: "2. Take the node with smallest f = g + h" },
    { line: 3, code: "3. If it is Goal, that path is optimal (if h admissible)" },
    { line: 4, code: "4. Mark it finished" },
    { line: 5, code: "5. Each child: g = parent g + edge cost" },
    { line: 6, code: "6. f = g + h for each child" },
    { line: 7, code: "7. Repeat until Goal or queue empty" },
    { line: 8, code: "8. Search completed" },
  ],
};

const TREE_HEURISTIC_OPTIONS: { value: TreeHeuristicMode; label: string }[] = [
  { value: "printed", label: "Printed h(n)" },
  { value: "zero", label: "h = 0" },
  { value: "underestimate", label: "Underestimate" },
  { value: "overestimate", label: "Overestimate" },
];

interface SearchTreeWorkspaceProps {
  algorithmId: SearchTreeAlgorithmId;
}

export function SearchTreeWorkspace({ algorithmId }: SearchTreeWorkspaceProps) {
  const [graph, setGraph] = useState<SearchTreeGraph>(() =>
    createCourseSearchTree(),
  );
  const [heuristicMode, setHeuristicMode] =
    useState<TreeHeuristicMode>("printed");
  const [steps, setSteps] = useState<AlgorithmStep<SearchTreeState>[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const playback = useVisualizerPlayback(steps, `${algorithmId}-tree`);
  const { setPendingPlay } = usePendingPlay(steps, playback);

  const editableState = useMemo(
    () => createInitialSearchTreeState(graph),
    [graph],
  );

  const activeState =
    hasGenerated && playback.currentStep
      ? playback.currentStep.state
      : editableState;

  const showHeuristicPicker =
    algorithmId === "a-star" || algorithmId === "greedy-bfs";

  const handleWatch = () => {
    setSteps(generateSearchTreeSteps(graph, algorithmId, heuristicMode));
    setHasGenerated(true);
    setPendingPlay(true);
  };

  const handleResetSearch = () => {
    playback.reset();
    setSteps([]);
    setHasGenerated(false);
    setPendingPlay(false);
  };

  const handleNewTree = () => {
    playback.reset();
    setGraph(createRandomSearchTree());
    setSteps([]);
    setHasGenerated(false);
    setPendingPlay(false);
  };

  const handleResetCourseTree = () => {
    playback.reset();
    setGraph(createCourseSearchTree());
    setSteps([]);
    setHasGenerated(false);
    setPendingPlay(false);
  };

  const handleSelectGoal = (nodeId: string) => {
    if (hasGenerated) return;
    setGraph((prev) => setSearchTreeGoal(prev, nodeId));
  };

  const currentNode =
    playback.currentStep?.state.currentNodeId != null
      ? playback.currentStep.state.nodes[
          playback.currentStep.state.currentNodeId
        ]
      : null;

  return (
    <div className="w-full space-y-6">
      {!hasGenerated && showHeuristicPicker && (
        <HeuristicPicker
          value={heuristicMode}
          options={TREE_HEURISTIC_OPTIONS}
          onChange={setHeuristicMode}
        />
      )}

      <WorkspaceShell
        stageLabel="Search tree"
        hasGenerated={hasGenerated}
        playback={playback}
        happeningIdle="The run will narrate each expansion here."
        metricsSummary="Numbers from this step"
        dock={
          !hasGenerated ? (
            <div className="flex flex-wrap items-center justify-center gap-1">
              <PrimaryAction flat onClick={handleWatch}>
                Watch it run
              </PrimaryAction>
              <GhostAction onClick={handleNewTree}>New tree</GhostAction>
              <GhostAction onClick={handleResetCourseTree}>
                Course tree
              </GhostAction>
            </div>
          ) : (
            <>
              <PlaybackToolbar playback={playback} />
              <GhostAction onClick={handleResetSearch}>
                Edit the tree
              </GhostAction>
            </>
          )
        }
        metricsContent={
          hasGenerated ? (
            <>
              <MetricsPanel
                metrics={playback.currentStep?.metrics ?? null}
                frontierLabel="Waiting to expand"
                pathLabel="Path cost g"
              />
              {currentNode && currentNode.gCost !== Infinity ? (
                <p className="text-sm text-muted mt-4 font-mono text-center">
                  Node {graph.nodes[currentNode.id]?.label}: g={currentNode.gCost}
                  {currentNode.hCost !== Infinity
                    ? ` · h=${currentNode.hCost.toFixed(1)} · f=${currentNode.fCost === Infinity ? "∞" : currentNode.fCost.toFixed(1)}`
                    : ""}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">Watch it run to see counts.</p>
          )
        }
        stepsContent={
          <StepExplanation
            step={playback.currentStep}
            emptyMessage="Run the search to highlight a line."
            pseudocode={TREE_PSEUDOCODE[algorithmId]}
          />
        }
      >
        <SearchTreeCanvas
          state={activeState}
          onSelectGoal={handleSelectGoal}
          isInteractive={!hasGenerated}
          showRunLegend={hasGenerated}
        />
      </WorkspaceShell>
    </div>
  );
}
