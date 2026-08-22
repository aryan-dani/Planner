export interface TreeNode {
  id: string;
  isMaxNode: boolean;
  value: number | null;
  children: TreeNode[];
}

export interface TreeState {
  tree: TreeNode;
  currentNodeId: string | null;
  evaluatedNodes: Record<string, number>;
  prunedNodes: string[];
  alpha: number | null;
  beta: number | null;
}
