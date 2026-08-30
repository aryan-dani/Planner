"use client";

import { GraduationCap, BookOpen } from "lucide-react";
import type { Branch, Semester } from "@/lib/academic/scope";
import {
  BRANCH_OPTIONS,
  BRANCH_OPTIONS_LONG,
  SEMESTER_OPTIONS,
  SEMESTER_OPTIONS_SHORT,
} from "@/lib/academic/scope";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";

export type ScopeSelectorVariant = "sidebar" | "inline" | "settings";

export interface ScopeSelectorProps {
  branch: Branch;
  semester: Semester;
  onBranchChange: (branch: Branch) => void;
  onSemesterChange: (semester: Semester) => void;
  variant?: ScopeSelectorVariant;
  className?: string;
  disabled?: boolean;
}

export function ScopeSelector({
  branch,
  semester,
  onBranchChange,
  onSemesterChange,
  variant = "sidebar",
  className,
  disabled = false,
}: ScopeSelectorProps) {
  if (variant === "settings") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted">Branch</label>
          <Select<Branch>
            value={branch}
            options={BRANCH_OPTIONS_LONG}
            onChange={onBranchChange}
            disabled={disabled}
            size="lg"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted">Semester</label>
          <Select<Semester>
            value={semester}
            options={SEMESTER_OPTIONS}
            onChange={onSemesterChange}
            disabled={disabled}
            size="lg"
            optionsLayout="grid-4"
          />
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2",
          className,
        )}
      >
        <Select<Branch>
          value={branch}
          options={BRANCH_OPTIONS}
          onChange={onBranchChange}
          disabled={disabled}
          size="sm"
          className="min-w-[5.5rem]"
        />
        <Select<Semester>
          value={semester}
          options={SEMESTER_OPTIONS_SHORT}
          onChange={onSemesterChange}
          disabled={disabled}
          size="sm"
          className="min-w-[5.5rem]"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Select<Branch>
        value={branch}
        options={BRANCH_OPTIONS}
        onChange={onBranchChange}
        disabled={disabled}
        size="md"
        icon={GraduationCap}
        className="flex-1 min-w-0"
      />
      <Select<Semester>
        value={semester}
        options={SEMESTER_OPTIONS}
        onChange={onSemesterChange}
        disabled={disabled}
        size="md"
        icon={BookOpen}
        className="flex-1 min-w-0"
      />
    </div>
  );
}
