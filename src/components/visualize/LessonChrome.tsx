"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { easeOut, fadeUp, stagger } from "@/components/visualize/motion";

export function HowToUse({ steps }: { steps: readonly [string, string, string] }) {
  return (
    <motion.ol
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border overflow-hidden"
    >
      {steps.map((step, index) => (
        <motion.li
          key={step}
          variants={fadeUp}
          className="bg-card px-4 py-4 flex gap-3 min-h-[4.75rem]"
        >
          <span className="font-mono text-[10px] text-muted shrink-0 pt-0.5">
            {String(index + 1).padStart(2, "0")}
          </span>
          <p className="text-sm text-foreground leading-relaxed">{step}</p>
        </motion.li>
      ))}
    </motion.ol>
  );
}

export function HappeningNow({
  text,
  idle,
}: {
  text: string | null;
  idle: string;
}) {
  const shown = text ?? idle;
  return (
    <div className="relative min-h-[3.25rem] pl-4">
      <span className="absolute left-0 top-1 bottom-1 w-px bg-foreground/70" />
      <AnimatePresence mode="wait">
        <motion.p
          key={shown}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: easeOut }}
          className={`text-sm leading-relaxed ${text ? "text-foreground" : "text-muted"}`}
        >
          {shown}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function StudyFold({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-t border-border">
      <summary className="min-h-11 cursor-pointer list-none flex items-center justify-between gap-3 py-3 text-sm text-muted hover:text-foreground">
        <span>{summary}</span>
        <span className="text-xs font-mono group-open:hidden">Show</span>
        <span className="text-xs font-mono hidden group-open:inline">Hide</span>
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

export function PrimaryAction({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.18, ease: easeOut }}
      className="min-h-11 px-5 bg-foreground text-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_10px_24px_-12px_rgb(var(--foreground)/0.55)]"
    >
      {children}
    </motion.button>
  );
}

export function GhostAction({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className="min-h-11 px-4 text-sm text-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </motion.button>
  );
}

export function Stage({
  label,
  live = false,
  children,
}: {
  label: string;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: easeOut }}
      className="border border-border bg-card/60 overflow-hidden shadow-[0_24px_60px_-36px_rgb(var(--foreground)/0.35)]"
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 h-11 border-b border-border bg-surface/40">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted">
          {label}
        </span>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-foreground">
            <span className="viz-live-dot w-1.5 h-1.5 rounded-full bg-foreground" />
            Live
          </span>
        )}
      </div>
      <div className="p-4 sm:p-6 bg-[linear-gradient(to_bottom,rgb(var(--surface)/0.35),transparent_42%)]">
        {children}
      </div>
    </motion.section>
  );
}
