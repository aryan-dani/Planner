"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  ALGORITHMS,
  START_HERE_IDS,
  TOPIC_GROUPS,
} from "@/lib/visualize/catalog";
import { VisualizerCredits } from "@/components/visualize/VisualizerCredits";
import {
  LivingGrid,
  QueenMark,
  RippleMark,
  StarMark,
} from "@/components/visualize/TopicMarks";
import { fadeUp, stagger } from "@/components/visualize/motion";

const START_MARKS = [RippleMark, StarMark, QueenMark];

export function AlgorithmExplorer() {
  const startHere = START_HERE_IDS.map((id) =>
    ALGORITHMS.find((algo) => algo.id === id),
  ).filter((algo): algo is NonNullable<typeof algo> => Boolean(algo));

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto page-gutter py-8 sm:py-14 min-h-[80vh] relative">
      <motion.header
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative mb-14 sm:mb-16"
      >
        <div className="absolute right-0 top-0 hidden lg:block pointer-events-none">
          <LivingGrid />
        </div>
        <motion.p
          variants={fadeUp}
          className="text-xs font-bold uppercase tracking-widest text-muted mb-4"
        >
          Academic
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="font-display text-5xl sm:text-6xl md:text-7xl text-foreground tracking-tight mb-5 max-w-xl"
        >
          Visualize
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-base sm:text-lg text-foreground-subtle leading-relaxed max-w-xl"
        >
          Watch an algorithm decide, one step at a time. Press Watch it run —
          you do not need the theory first.
        </motion.p>
        <motion.p variants={fadeUp} className="mt-5">
          <Link
            href="/visualize/progress"
            className="text-sm text-muted hover:text-foreground animated-underline"
          >
            Saved mazes and completions
          </Link>
        </motion.p>
      </motion.header>

      <section className="mb-16">
        <p className="text-xs font-medium tracking-wide uppercase text-muted mb-4">
          Start here
        </p>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border"
        >
          {startHere.map((algo, index) => {
            const Mark = START_MARKS[index] ?? RippleMark;
            return (
              <motion.div key={algo.id} variants={fadeUp}>
                <Link
                  href={`/visualize/${algo.id}`}
                  className="group relative bg-card hover:bg-surface p-6 sm:p-7 flex flex-col min-h-[15rem] transition-colors duration-300"
                >
                  <div className="absolute left-0 top-4 bottom-4 w-[2px] bg-foreground scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />
                  <div className="flex items-start justify-between mb-8">
                    <span className="font-mono text-[10px] text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <Mark />
                  </div>
                  <div className="mt-auto">
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      {algo.shortName}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed mb-4">
                      {algo.inOneSentence}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                      Open
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="space-y-12"
      >
        {TOPIC_GROUPS.map((group) => {
          const items = group.ids
            .map((id) => ALGORITHMS.find((algo) => algo.id === id))
            .filter((algo): algo is NonNullable<typeof algo> => Boolean(algo));
          return (
            <motion.div key={group.id} variants={fadeUp}>
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {group.title}
                </h2>
                <p className="text-sm text-muted mt-0.5">{group.blurb}</p>
              </div>
              <ul className="divide-y divide-border border-y border-border">
                {items.map((algo) => (
                  <li key={algo.id}>
                    <Link
                      href={`/visualize/${algo.id}`}
                      className="group flex items-baseline justify-between gap-4 py-4 hover:bg-surface/60 -mx-2 px-2 transition-colors duration-200"
                    >
                      <span className="min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {algo.name}
                        </span>
                        <span className="block sm:inline sm:before:content-['—'] sm:before:mx-2 text-sm text-muted">
                          {algo.description}
                        </span>
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted group-hover:text-foreground transition-colors">
                        Open
                        <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </motion.section>

      <footer className="mt-20 pt-6 border-t border-border">
        <VisualizerCredits />
      </footer>
    </div>
  );
}
