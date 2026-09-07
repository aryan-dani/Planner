"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Star,
  StarOff,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type AppToastKind =
  | "success"
  | "error"
  | "info"
  | "star"
  | "unstar"
  | "loading";

export interface AppToastProps {
  kind?: AppToastKind;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
}

const kindIcon: Record<AppToastKind, ReactNode> = {
  success: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />,
  error: <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.25} />,
  info: <Info className="w-3.5 h-3.5" strokeWidth={2.25} />,
  star: <Star className="w-3.5 h-3.5 fill-current" strokeWidth={2} />,
  unstar: <StarOff className="w-3.5 h-3.5" strokeWidth={2.25} />,
  loading: <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.25} />,
};

export function AppToast({
  kind = "info",
  title,
  description,
  action,
  icon,
}: AppToastProps) {
  const isError = kind === "error";

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-[min(100vw-2rem,22rem)] items-start gap-3 rounded-xl border bg-card/95 px-3.5 py-3 shadow-card-hover backdrop-blur-md",
        isError ? "border-destructive/35" : "border-border/80",
      )}
      role="status"
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          isError
            ? "border-destructive/25 bg-destructive/10 text-destructive"
            : kind === "star"
              ? "border-border bg-foreground text-background"
              : "border-border bg-surface text-foreground",
        )}
      >
        {icon ?? kindIcon[kind]}
      </div>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 text-xs text-foreground-subtle line-clamp-2">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
