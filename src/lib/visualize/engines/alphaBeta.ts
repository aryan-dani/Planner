import { TreeNode, TreeState } from "@/lib/visualize/tree";
import { AlgorithmStep } from "@/lib/visualize/types";

export function generateAlphaBetaSteps(root: TreeNode): AlgorithmStep<TreeState>[] {
  const steps: AlgorithmStep<TreeState>[] = [];
  let stepCounter = 0;

  const evaluatedNodes: Record<string, number> = {};
  const prunedNodes = new Set<string>();

  function collectDescendants(node: TreeNode, collected: string[]) {
    collected.push(node.id);
    for (const child of node.children) {
      collectDescendants(child, collected);
    }
  }

  function pushStep(
    desc: string,
    currentId: string,
    line: number,
    alphaVal: number,
    betaVal: number,
  ) {
    steps.push({
      stepIndex: stepCounter++,
      description: desc,
      highlightedLine: line,
      state: {
        tree: root,
        currentNodeId: currentId,
        evaluatedNodes: { ...evaluatedNodes },
        prunedNodes: Array.from(prunedNodes),
        alpha: alphaVal === -Infinity ? null : alphaVal,
        beta: betaVal === Infinity ? null : betaVal,
      },
      metrics: {
        nodesExplored: Object.keys(evaluatedNodes).length,
        frontierSize: prunedNodes.size,
        pathCost: 0,
        totalSteps: 0,
      },
    });
  }

  function alphaBeta(node: TreeNode, alpha: number, beta: number): number {
    pushStep(
      `Visiting node ${node.id} (${node.isMaxNode ? "MAX" : "MIN"}). α=${alpha === -Infinity ? "-∞" : alpha}, β=${beta === Infinity ? "+∞" : beta}`,
      node.id,
      1,
      alpha,
      beta,
    );

    if (node.children.length === 0) {
      evaluatedNodes[node.id] = node.value!;
      pushStep(
        `Leaf node reached. Found terminal value: ${node.value}`,
        node.id,
        2,
        alpha,
        beta,
      );
      return node.value!;
    }

    if (node.isMaxNode) {
      let maxEval = -Infinity;
      pushStep("Initializing max evaluation to -Infinity.", node.id, 3, alpha, beta);

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const evalScore = alphaBeta(child, alpha, beta);

        maxEval = Math.max(maxEval, evalScore);
        evaluatedNodes[node.id] = maxEval;
        pushStep(`Current MAX value updated to ${maxEval}.`, node.id, 4, alpha, beta);

        alpha = Math.max(alpha, evalScore);
        pushStep(`Updated α to ${alpha}.`, node.id, 5, alpha, beta);

        if (beta <= alpha) {
          const prunedIds: string[] = [];
          for (let j = i + 1; j < node.children.length; j++) {
            collectDescendants(node.children[j], prunedIds);
          }
          prunedIds.forEach((id) => prunedNodes.add(id));

          if (prunedIds.length > 0) {
            pushStep(
              `β (${beta}) ≤ α (${alpha}). Pruning ${prunedIds.length} remaining branches!`,
              node.id,
              6,
              alpha,
              beta,
            );
          }
          break;
        }
      }

      pushStep(
        `MAX node fully evaluated. Best choice is ${maxEval}.`,
        node.id,
        7,
        alpha,
        beta,
      );
      return maxEval;
    }

    let minEval = Infinity;
    pushStep("Initializing min evaluation to +Infinity.", node.id, 8, alpha, beta);

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const evalScore = alphaBeta(child, alpha, beta);

      minEval = Math.min(minEval, evalScore);
      evaluatedNodes[node.id] = minEval;
      pushStep(`Current MIN value updated to ${minEval}.`, node.id, 9, alpha, beta);

      beta = Math.min(beta, evalScore);
      pushStep(`Updated β to ${beta}.`, node.id, 10, alpha, beta);

      if (beta <= alpha) {
        const prunedIds: string[] = [];
        for (let j = i + 1; j < node.children.length; j++) {
          collectDescendants(node.children[j], prunedIds);
        }
        prunedIds.forEach((id) => prunedNodes.add(id));

        if (prunedIds.length > 0) {
          pushStep(
            `β (${beta}) ≤ α (${alpha}). Pruning ${prunedIds.length} remaining branches!`,
            node.id,
            11,
            alpha,
            beta,
          );
        }
        break;
      }
    }

    pushStep(
      `MIN node fully evaluated. Best choice is ${minEval}.`,
      node.id,
      12,
      alpha,
      beta,
    );
    return minEval;
  }

  pushStep("Initialized Alpha-Beta Pruning.", root.id, 0, -Infinity, Infinity);
  alphaBeta(root, -Infinity, Infinity);
  pushStep(
    `Alpha-Beta complete. Optimal game value is ${evaluatedNodes[root.id]}.`,
    root.id,
    13,
    -Infinity,
    Infinity,
  );

  steps.forEach((s) => (s.metrics.totalSteps = steps.length));
  return steps;
}
