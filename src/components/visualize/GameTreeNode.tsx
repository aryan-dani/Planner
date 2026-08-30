"use client";

import { memo } from "react";
import type { TreeNode } from "@/lib/visualize/tree";
import type { TreeState } from "@/lib/visualize/tree";

export interface GameTreeNodeProps {
  node: TreeNode;
  activeState: TreeState | null;
}

function GameTreeNodeComponent({ node, activeState }: GameTreeNodeProps) {
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
            ${isCurrent ? "viz-cell-current" : ""}
            ${isPruned ? "line-through" : ""}
          `}
          title={node.isMaxNode ? "MAX: wants a high number" : "MIN: wants a low number"}
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
              <GameTreeNodeComponent node={child} activeState={activeState} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const GameTreeNode = memo(GameTreeNodeComponent);
