export type VisualizeStructure = "graph" | "tree";

const PATH_IDS = new Set(["bfs", "dfs", "ucs", "greedy-bfs", "a-star"]);

export function supportsStructureToggle(algorithmId: string): boolean {
  return PATH_IDS.has(algorithmId);
}

export function structureFromParam(
  param: string | undefined,
): VisualizeStructure {
  return param === "tree" ? "tree" : "graph";
}
