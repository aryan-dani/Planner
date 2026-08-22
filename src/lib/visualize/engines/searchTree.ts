import { MinHeap } from "@/lib/visualize/priorityQueue";
import { AlgorithmStep } from "@/lib/visualize/types";
import {
  SearchTreeGraph,
  SearchTreeNodeDef,
  SearchTreeRuntimeNode,
  SearchTreeState,
  TreeHeuristicMode,
  cloneSearchTreeGraph,
  createInitialSearchTreeState,
  getSearchTreePath,
  resolveTreeHeuristic,
} from "@/lib/visualize/searchTree";

export type SearchTreeAlgorithmId =
  | "bfs"
  | "dfs"
  | "ucs"
  | "greedy-bfs"
  | "a-star";

function cloneRuntimeNodes(
  nodes: Record<string, SearchTreeRuntimeNode>,
): Record<string, SearchTreeRuntimeNode> {
  const out: Record<string, SearchTreeRuntimeNode> = {};
  for (const [id, node] of Object.entries(nodes)) {
    out[id] = { ...node, children: [...node.children] };
  }
  return out;
}

function snapshotState(
  graph: SearchTreeGraph,
  nodes: Record<string, SearchTreeRuntimeNode>,
  startId: string,
  goalId: string,
  currentNodeId: string | null,
  frontierIds: string[],
  visitedIds: string[],
  pathIds: string[],
  consideredChildIds: string[],
): SearchTreeState {
  return {
    graph: cloneSearchTreeGraph(graph),
    nodes: cloneRuntimeNodes(nodes),
    startId,
    goalId,
    currentNodeId,
    frontierIds: [...frontierIds],
    visitedIds: [...visitedIds],
    pathIds: [...pathIds],
    consideredChildIds: [...consideredChildIds],
  };
}

function gCostAlongPath(
  graph: SearchTreeGraph,
  nodeId: string,
): number {
  let total = 0;
  let current: string | null = nodeId;
  while (current && current !== graph.rootId) {
    const node: SearchTreeNodeDef | undefined = graph.nodes[current];
    if (!node) break;
    total += node.edgeCost;
    current = node.parentId;
  }
  return total;
}

function pushStep(
  steps: AlgorithmStep<SearchTreeState>[],
  stepCounter: number,
  description: string,
  highlightedLine: number,
  state: SearchTreeState,
  nodesExplored: number,
  frontierSize: number,
  pathCost: number,
): number {
  steps.push({
    stepIndex: stepCounter,
    description,
    highlightedLine,
    state,
    metrics: {
      nodesExplored,
      frontierSize,
      pathCost,
      totalSteps: 0,
    },
  });
  return stepCounter + 1;
}

export function generateSearchTreeSteps(
  graph: SearchTreeGraph,
  algorithmId: SearchTreeAlgorithmId,
  heuristicMode: TreeHeuristicMode = "printed",
): AlgorithmStep<SearchTreeState>[] {
  const steps: AlgorithmStep<SearchTreeState>[] = [];
  let stepCounter = 0;

  const workingGraph = cloneSearchTreeGraph(graph);
  const nodes = createInitialSearchTreeState(workingGraph).nodes;
  const startId = workingGraph.rootId;
  const goalId = workingGraph.goalId;

  const start = nodes[startId];
  start.gCost = 0;
  start.hCost = resolveTreeHeuristic(heuristicMode, start, goalId, workingGraph);
  start.fCost = start.gCost + start.hCost;

  const visitedSet = new Set<string>();
  const frontierIds: string[] = [startId];
  let frontierQueue: string[] = [startId];
  let frontierStack: string[] = [startId];
  const openHeap = new MinHeap<{ id: string; priority: number; g: number }>(
    (a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.g - b.g;
    },
  );

  if (algorithmId === "ucs" || algorithmId === "greedy-bfs" || algorithmId === "a-star") {
    const priority =
      algorithmId === "ucs"
        ? start.gCost
        : algorithmId === "greedy-bfs"
          ? start.hCost
          : start.fCost;
    openHeap.push({ id: startId, priority, g: start.gCost });
  }

  const algoName =
    algorithmId === "bfs"
      ? "Breadth-First Search"
      : algorithmId === "dfs"
        ? "Depth-First Search"
        : algorithmId === "ucs"
          ? "Uniform Cost Search"
          : algorithmId === "greedy-bfs"
            ? "Greedy Best-First Search"
            : "A* Search";

  stepCounter = pushStep(
    steps,
    stepCounter,
    `Initialized ${algoName} on the search tree.`,
    1,
    snapshotState(
      workingGraph,
      nodes,
      startId,
      goalId,
      startId,
      frontierIds,
      [],
      [],
      [],
    ),
    0,
    frontierIds.length,
    0,
  );

  while (true) {
    let currentId: string | undefined;

    if (algorithmId === "bfs") {
      if (frontierQueue.length === 0) break;
      currentId = frontierQueue.shift();
    } else if (algorithmId === "dfs") {
      if (frontierStack.length === 0) break;
      currentId = frontierStack.pop();
    } else {
      if (openHeap.isEmpty()) break;
      const popped = openHeap.pop()!;
      currentId = popped.id;
    }

    if (!currentId || visitedSet.has(currentId)) {
      continue;
    }

    const current = nodes[currentId];
    const currentG = gCostAlongPath(workingGraph, currentId);
    current.gCost = currentG;
    current.hCost = resolveTreeHeuristic(
      heuristicMode,
      current,
      goalId,
      workingGraph,
    );
    current.fCost = current.gCost + current.hCost;

    const frontierIdx = frontierIds.indexOf(currentId);
    if (frontierIdx !== -1) {
      frontierIds.splice(frontierIdx, 1);
    }

    if (currentId === goalId) {
      const pathIds = getSearchTreePath(nodes, goalId);
      stepCounter = pushStep(
        steps,
        stepCounter,
        `Goal ${nodes[goalId].label} reached. Path cost g(n) = ${currentG}.`,
        3,
        snapshotState(
          workingGraph,
          nodes,
          startId,
          goalId,
          currentId,
          frontierIds,
          [...visitedSet, currentId],
          pathIds,
          [],
        ),
        visitedSet.size + 1,
        frontierIds.length,
        currentG,
      );
      break;
    }

    visitedSet.add(currentId);
    const consideredChildIds: string[] = [];

    for (const childId of current.children) {
      if (visitedSet.has(childId)) continue;
      consideredChildIds.push(childId);

      const child = nodes[childId];
      const childG = gCostAlongPath(workingGraph, childId);
      child.gCost = childG;
      child.hCost = resolveTreeHeuristic(
        heuristicMode,
        child,
        goalId,
        workingGraph,
      );
      child.fCost = child.gCost + child.hCost;

      if (!frontierIds.includes(childId)) {
        frontierIds.push(childId);
      }

      if (algorithmId === "bfs") {
        if (!frontierQueue.includes(childId)) {
          frontierQueue.push(childId);
        }
      } else if (algorithmId === "dfs") {
        if (!frontierStack.includes(childId)) {
          frontierStack.push(childId);
        }
      } else {
        const priority =
          algorithmId === "ucs"
            ? childG
            : algorithmId === "greedy-bfs"
              ? child.hCost
              : child.fCost;
        openHeap.push({ id: childId, priority, g: childG });
      }
    }

    const label = nodes[currentId].label;
    const scoreLine =
      algorithmId === "ucs"
        ? `g=${currentG}`
        : algorithmId === "greedy-bfs"
          ? `h=${current.hCost.toFixed(1)}`
          : algorithmId === "a-star"
            ? `f=${current.fCost.toFixed(1)} (g=${currentG}, h=${current.hCost.toFixed(1)})`
            : `depth expanded`;

    stepCounter = pushStep(
      steps,
      stepCounter,
      `Expanded node ${label}. ${scoreLine}. ${consideredChildIds.length} child${consideredChildIds.length === 1 ? "" : "ren"} queued.`,
      2,
      snapshotState(
        workingGraph,
        nodes,
        startId,
        goalId,
        currentId,
        frontierIds,
        [...visitedSet],
        [],
        consideredChildIds,
      ),
      visitedSet.size,
      frontierIds.length,
      currentG,
    );
  }

  if (steps.length > 0 && !steps[steps.length - 1].description.includes("Goal")) {
    stepCounter = pushStep(
      steps,
      stepCounter,
      "Search finished without reaching the goal.",
      8,
      snapshotState(
        workingGraph,
        nodes,
        startId,
        goalId,
        null,
        [],
        [...visitedSet],
        [],
        [],
      ),
      visitedSet.size,
      0,
      0,
    );
  }

  steps.forEach((s) => {
    s.metrics.totalSteps = steps.length;
  });

  return steps;
}
