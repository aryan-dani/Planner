"use client";

import type { ReactNode } from "react";
import { AlgorithmStep } from "@/lib/visualize/types";

export type PseudocodeLine = { line: number; code: string };

export interface StepExplanationProps<TState> {
  step: AlgorithmStep<TState> | null;
  emptyMessage: string;
  title?: string;
  pseudocode: PseudocodeLine[];
  extra?: ReactNode;
}

export function StepExplanation<TState>({
  step,
  emptyMessage,
  title = "What the code is doing",
  pseudocode,
  extra,
}: StepExplanationProps<TState>) {
  if (!step) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  const maxLine = Math.max(...pseudocode.map((item) => item.line), 1);
  let activeLine = step.highlightedLine;
  if (activeLine > maxLine) activeLine = maxLine;
  if (activeLine < 1) activeLine = 1;

  return (
    <div className="space-y-4">
      {extra}
      <div>
        <p className="text-xs text-muted mb-2">{title}</p>
        <div className="font-mono text-[12px] leading-relaxed text-muted overflow-x-auto">
          {pseudocode.map((item) => {
            const isHighlighted = item.line === activeLine;
            return (
              <div
                key={item.line}
                className={`px-2 py-1 ${
                  isHighlighted
                    ? "bg-surface text-foreground border-l-2 border-foreground"
                    : "border-l-2 border-transparent"
                }`}
              >
                {item.code}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
