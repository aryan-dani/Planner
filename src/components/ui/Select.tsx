"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

export type SelectSize = "sm" | "md" | "lg";

const triggerSizeClasses: Record<SelectSize, string> = {
  sm: "px-2 py-1.5 text-2xs font-semibold rounded-lg",
  md: "px-3 py-2 text-xs font-semibold rounded-xl",
  lg: "px-4 py-3 text-sm rounded-xl",
};

export interface SelectProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  size?: SelectSize;
  className?: string;
  /** Grid layout for options panel (e.g. semester 4-col in settings) */
  optionsLayout?: "list" | "grid-4";
}

function SelectInner<T extends string | number>({
  value,
  options,
  onChange,
  label,
  placeholder = "Select",
  icon: Icon,
  disabled = false,
  size = "md",
  className,
  optionsLayout = "list",
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-1.5",
          "bg-background border border-border text-foreground",
          "hover:border-border-strong hover:bg-surface/55 transition-colors",
          "focus-visible:outline-offset-1 disabled:opacity-40 disabled:cursor-not-allowed",
          triggerSizeClasses[size],
        )}
      >
        <span className="flex items-center gap-1.5 truncate min-w-0">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted shrink-0" />}
          <span className="truncate">{selected?.label ?? label ?? placeholder}</span>
        </span>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-muted shrink-0 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className={cn(
              "absolute left-0 right-0 top-full mt-1.5 z-dropdown",
              "bg-card border border-border rounded-xl shadow-popover overflow-hidden p-1",
              optionsLayout === "grid-4"
                ? "grid grid-cols-4 gap-1"
                : "flex flex-col gap-0.5",
            )}
          >
            {options.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "text-left transition-colors rounded-lg",
                  optionsLayout === "grid-4"
                    ? "py-2 text-xs font-semibold text-center"
                    : "w-full flex items-center px-3 py-2 text-xs font-medium",
                  value === opt.value
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted hover:bg-surface hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const Select = memo(SelectInner) as typeof SelectInner;
