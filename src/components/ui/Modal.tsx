"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** sm: narrow dialog, md: default, lg: wide */
  size?: "sm" | "md" | "lg" | "full";
  showClose?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  full: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "relative z-modal w-full rounded-xl border border-border bg-card shadow-lg",
              "max-h-[min(85vh,720px)] flex flex-col overflow-hidden",
              sizeClasses[size],
              className,
            )}
          >
            {(title || showClose) && (
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 sm:px-5 py-3 shrink-0">
                {title ? (
                  <h2 className="text-sm font-semibold text-foreground truncate">
                    {title}
                  </h2>
                ) : (
                  <span />
                )}
                {showClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0 -mr-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-4 sm:p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
