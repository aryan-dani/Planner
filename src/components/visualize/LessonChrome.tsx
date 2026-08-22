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
      className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border rounded-xl overflow-hidden shadow-sm"
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
    <div className="relative mx-auto w-full max-w-xl h-12 rounded-lg border border-border bg-card px-4">
      <AnimatePresence mode="wait">
        <motion.p
          key={shown}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: easeOut }}
          className="absolute inset-0 flex items-center justify-center px-1"
        >
          <span
            className={`text-sm leading-snug text-center line-clamp-2 ${
              text ? "text-foreground" : "text-muted"
            }`}
          >
            {shown}
          </span>
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
  flat = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  flat?: boolean;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled || flat ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.18, ease: easeOut }}
      className={`min-h-11 px-5 bg-foreground text-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed rounded-md ${
        flat ? "" : "shadow-[0_10px_24px_-12px_rgb(var(--foreground)/0.55)]"
      }`}
    >
      {children}
    </motion.button>
  );
}

export function GhostAction({
  children,
  onClick,
  disabled,
  flat = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  flat?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled || flat ? undefined : { y: -1 }}
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
  dock,
}: {
  label: string;
  live?: boolean;
  children: ReactNode;
  dock?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: easeOut }}
      className="border border-border bg-card/60 rounded-xl overflow-hidden"
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
      <div className="p-4 sm:p-6 overflow-hidden bg-[linear-gradient(to_bottom,rgb(var(--surface)/0.35),transparent_42%)]">
        {children}
      </div>
      {dock ? (
        <div className="border-t border-border bg-card px-4 sm:px-6 py-4">
          {dock}
        </div>
      ) : null}
    </motion.section>
  );
}
