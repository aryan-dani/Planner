"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  structureFromParam,
  supportsStructureToggle,
} from "@/lib/visualize/structure";

export function StructureToggle({ algorithmId }: { algorithmId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const structure = structureFromParam(
    searchParams.get("structure") ?? undefined,
  );

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
