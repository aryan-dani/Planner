import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "sm" | "md";
}

const sizeClasses = {
  sm: "min-h-9 px-3 py-2 text-sm",
  md: "min-h-11 px-4 py-2.5 text-sm",
};

export function Input({
  inputSize = "md",
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-background text-foreground",
        "placeholder:text-muted input-premium-focus",
        "disabled:cursor-not-allowed disabled:opacity-40",
        sizeClasses[inputSize],
        className,
      )}
      {...props}
    />
  );
}
