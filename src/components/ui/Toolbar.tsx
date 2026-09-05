import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Sticky under page chrome */
  sticky?: boolean;
}

export function Toolbar({
  children,
  sticky = false,
  className,
  ...props
}: ToolbarProps) {
  return (
    <div
      className={cn(
        "os-toolbar",
        sticky && "sticky top-0 z-sticky",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ToolbarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ToolbarGroup({
  children,
  className,
  ...props
}: ToolbarGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
