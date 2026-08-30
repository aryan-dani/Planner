"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: ReactNode;
};

export interface SegmentedProps<T extends string | number> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

const sizeClasses = {
  sm: "min-h-8 px-2.5 text-2xs",
  md: "min-h-9 px-3 text-xs",
};

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled = false,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex overflow-hidden rounded-lg border border-border bg-surface/40",
        className,
      )}
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center font-mono uppercase tracking-wide transition-colors disabled:opacity-40",
              sizeClasses[size],
              active
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground",
              index < options.length - 1 && "border-r border-border",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
