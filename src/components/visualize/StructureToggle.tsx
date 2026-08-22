"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type VisualizeStructure = "graph" | "tree";

const PATH_IDS = new Set(["bfs", "dfs", "ucs", "greedy-bfs", "a-star"]);

export function supportsStructureToggle(algorithmId: string): boolean {
  return PATH_IDS.has(algorithmId);
}

export function StructureToggle({ algorithmId }: { algorithmId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const structure: VisualizeStructure =
    searchParams.get("structure") === "tree" ? "tree" : "graph";

  if (!supportsStructureToggle(algorithmId)) {
    return null;
  }

  const base = pathname;

  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-surface/40 p-1">
      <Link
        href={base}
        className={`min-h-9 px-4 rounded-lg text-xs font-medium transition-colors ${
          structure === "graph"
            ? "bg-foreground text-background"
            : "text-muted hover:text-foreground"
        }`}
      >
        Graph
      </Link>
      <Link
        href={`${base}?structure=tree`}
        className={`min-h-9 px-4 rounded-lg text-xs font-medium transition-colors ${
          structure === "tree"
            ? "bg-foreground text-background"
            : "text-muted hover:text-foreground"
        }`}
      >
        Tree
      </Link>
    </div>
  );
}

export function structureFromParam(
  param: string | undefined,
): VisualizeStructure {
  return param === "tree" ? "tree" : "graph";
}
