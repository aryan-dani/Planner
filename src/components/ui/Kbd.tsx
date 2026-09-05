import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd className={cn("kbd", className)} {...props}>
      {children}
    </kbd>
  );
}

export interface KbdHintsProps {
  keys: string[];
  className?: string;
}

export function KbdHints({ keys, className }: KbdHintsProps) {
  return (
    <div
      className={cn(
        "hidden sm:flex items-center gap-1 px-1.5 border-r border-border/60 mr-0.5",
        className,
      )}
      aria-hidden
    >
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </div>
  );
}
