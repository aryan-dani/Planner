import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "default" | "outline" | "active";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface border border-border text-muted",
  outline: "border border-border text-muted bg-transparent",
  active: "bg-foreground text-background border border-transparent",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  uppercase?: boolean;
}

export function Badge({
  children,
  variant = "default",
  uppercase = false,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-2xs font-medium",
        uppercase && "font-mono uppercase tracking-wider",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
