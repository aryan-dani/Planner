"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { GridWorkspace } from "@/components/visualize/GridWorkspace";
import { SearchTreeWorkspace } from "@/components/visualize/SearchTreeWorkspace";
import { GameTreeWorkspace } from "@/components/visualize/GameTreeWorkspace";
import { OptimizationWorkspace } from "@/components/visualize/OptimizationWorkspace";
import { CspWorkspace } from "@/components/visualize/CspWorkspace";
import { StructureToggle } from "@/components/visualize/StructureToggle";
import { VisualizeStructure } from "@/lib/visualize/structure";
import { HowToUse } from "@/components/visualize/LessonChrome";
import { fadeUp, stagger } from "@/components/visualize/motion";
import { motion } from "framer-motion";
import { AlgorithmMeta } from "@/lib/visualize/types";
import { SearchTreeAlgorithmId } from "@/lib/visualize/engines/searchTree";
import { fetchSavedGrid } from "@/lib/visualize/client";
import { SavedGridData } from "@/lib/visualize/grid";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface VisualizerWorkspaceProps {
  algorithm: AlgorithmMeta;
  gridId?: string;
  structure?: VisualizeStructure;
}

const PATH_ALGORITHM_IDS = new Set([
  "bfs",
  "dfs",
  "ucs",
  "greedy-bfs",
  "a-star",
]);

function VisualizerWorkspaceInner({
  algorithm,
  gridId,
  structure = "graph",
}: VisualizerWorkspaceProps) {
  const [loadedGrid, setLoadedGrid] = useState<SavedGridData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!gridId || structure === "tree") return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoadError("Sign in to open a saved maze.");
        return;
      }
      try {
        const grid = await fetchSavedGrid(gridId);
        if (!grid) {
          setLoadError("That saved maze was not found.");
          return;
        }
        setLoadedGrid(grid.gridData);
      } catch {
        setLoadError("Could not load the saved maze.");
      }
    });
    return () => unsub();
  }, [gridId, structure]);

  const isPathAlgorithm = PATH_ALGORITHM_IDS.has(algorithm.id);
  const useTree = isPathAlgorithm && structure === "tree";

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto page-gutter py-8 min-h-[80vh]">
      <motion.header
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-2xl mb-8"
      >
        <motion.div variants={fadeUp}>
          <Link
            href="/visualize"
            className="text-xs text-muted hover:text-foreground animated-underline"
          >
            ← Visualize
          </Link>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="font-display text-3xl sm:text-5xl text-foreground tracking-tight mt-4"
        >
          {algorithm.name}
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg text-foreground-subtle mt-3 leading-relaxed"
        >
          {algorithm.inOneSentence}
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center gap-2 mt-4"
        >
          <span className="inline-flex h-6 items-center text-[10px] font-mono uppercase tracking-widest text-muted px-2 border border-border rounded-md">
            {algorithm.category}
          </span>
          <span className="inline-flex h-6 items-center text-[10px] font-mono uppercase tracking-widest text-muted px-2 border border-border rounded-md">
            {algorithm.difficulty}
          </span>
          {isPathAlgorithm && <StructureToggle algorithmId={algorithm.id} />}
        </motion.div>
      </motion.header>

      <div className="mb-8">
        <HowToUse steps={algorithm.howTo} />
      </div>

      {loadError && structure === "graph" && (
        <p className="text-sm text-muted mb-4">{loadError}</p>
      )}

      {useTree && (
        <SearchTreeWorkspace
          algorithmId={algorithm.id as SearchTreeAlgorithmId}
        />
      )}

      {!useTree && algorithm.visualizerType === "grid" && (
        <GridWorkspace
          algorithmId={algorithm.id}
          initialGridData={loadedGrid}
        />
      )}
      {!useTree && algorithm.visualizerType === "game-tree" && (
        <GameTreeWorkspace algorithmId={algorithm.id} />
      )}
      {!useTree && algorithm.visualizerType === "optimization" && (
        <OptimizationWorkspace algorithmId={algorithm.id} />
      )}
      {!useTree && algorithm.visualizerType === "csp" && (
        <CspWorkspace algorithmId={algorithm.id} />
      )}
    </div>
  );
}

export function VisualizerWorkspace(props: VisualizerWorkspaceProps) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 w-full max-w-7xl mx-auto page-gutter py-8 min-h-[80vh]">
          <p className="text-sm text-muted">Loading visualizer…</p>
        </div>
      }
    >
      <VisualizerWorkspaceInner {...props} />
    </Suspense>
  );
}
