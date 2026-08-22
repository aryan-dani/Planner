"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GridWorkspace } from "@/components/visualize/GridWorkspace";
import { GameTreeWorkspace } from "@/components/visualize/GameTreeWorkspace";
import { OptimizationWorkspace } from "@/components/visualize/OptimizationWorkspace";
import { CspWorkspace } from "@/components/visualize/CspWorkspace";
import { HowToUse } from "@/components/visualize/LessonChrome";
import { VisualizerCredits } from "@/components/visualize/VisualizerCredits";
import { fadeUp, stagger } from "@/components/visualize/motion";
import { motion } from "framer-motion";
import { AlgorithmMeta } from "@/lib/visualize/types";
import { fetchSavedGrid } from "@/lib/visualize/client";
import { SavedGridData } from "@/lib/visualize/grid";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface VisualizerWorkspaceProps {
  algorithm: AlgorithmMeta;
  gridId?: string;
}

export function VisualizerWorkspace({
  algorithm,
  gridId,
}: VisualizerWorkspaceProps) {
  const [loadedGrid, setLoadedGrid] = useState<SavedGridData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!gridId) return;
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
  }, [gridId]);

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
      </motion.header>

      <div className="mb-8">
        <HowToUse steps={algorithm.howTo} />
      </div>

      {loadError && <p className="text-sm text-muted mb-4">{loadError}</p>}

      {algorithm.visualizerType === "grid" && (
        <GridWorkspace
          algorithmId={algorithm.id}
          initialGridData={loadedGrid}
        />
      )}
      {algorithm.visualizerType === "game-tree" && (
        <GameTreeWorkspace algorithmId={algorithm.id} />
      )}
      {algorithm.visualizerType === "optimization" && (
        <OptimizationWorkspace algorithmId={algorithm.id} />
      )}
      {algorithm.visualizerType === "csp" && (
        <CspWorkspace algorithmId={algorithm.id} />
      )}

      <footer className="mt-12 pt-6 border-t border-border">
        <VisualizerCredits />
      </footer>
    </div>
  );
}
