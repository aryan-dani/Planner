"use client";

import { CalendarRange } from "lucide-react";
import type { AcademicYear, Branch, Semester } from "@/lib/academic/scope";
import {
  ACADEMIC_YEAR_OPTIONS,
  ACADEMIC_YEAR_OPTIONS_SHORT,
  ACADEMIC_YEAR_OPTIONS_SIDEBAR,
  BRANCH_OPTIONS,
  BRANCH_OPTIONS_LONG,
  SEMESTER_OPTIONS_SHORT,
} from "@/lib/academic/scope";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";

export type ScopeSelectorVariant = "sidebar" | "inline" | "settings";

export interface ScopeSelectorProps {
  academicYear: AcademicYear;
  branch: Branch;
  semester: Semester;
  onAcademicYearChange: (year: AcademicYear) => void;
  onBranchChange: (branch: Branch) => void;
  onSemesterChange: (semester: Semester) => void;
  variant?: ScopeSelectorVariant;
  className?: string;
  disabled?: boolean;
}

export function ScopeSelector({
  academicYear,
  branch,
  semester,
  onAcademicYearChange,
  onBranchChange,
  onSemesterChange,
  variant = "sidebar",
  className,
  disabled = false,
}: ScopeSelectorProps) {
  if (variant === "settings") {
    return (
      <div className={cn("flex flex-col gap-5", className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted">Academic year</label>
            <Select<AcademicYear>
              value={academicYear}
              options={ACADEMIC_YEAR_OPTIONS}
              onChange={onAcademicYearChange}
              disabled={disabled}
              size="lg"
            />
          </div>
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
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted">Semester</label>
          <div
            className="grid grid-cols-4 sm:grid-cols-8 gap-2"
            role="radiogroup"
            aria-label="Semester"
          >
            {SEMESTER_OPTIONS_SHORT.map((opt) => {
              const active = semester === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => onSemesterChange(opt.value)}
                  className={cn(
                    "min-h-10 rounded-xl border text-xs font-bold transition-all",
                    "focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed",
                    active
                      ? "bg-foreground text-background border-foreground shadow-xs"
                      : "bg-background text-muted border-border hover:border-border-strong hover:text-foreground hover:bg-surface/50",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
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
        <Select<AcademicYear>
          value={academicYear}
          options={ACADEMIC_YEAR_OPTIONS_SHORT}
          onChange={onAcademicYearChange}
          disabled={disabled}
          size="sm"
          className="min-w-[5.5rem]"
        />
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
    <div className={cn("flex flex-col gap-2.5", className)}>
      <ScopeField
        label="Year"
        hint={academicYear === "2026-2027" ? "Current" : "Archive"}
      >
        <Select<AcademicYear>
          value={academicYear}
          options={ACADEMIC_YEAR_OPTIONS_SIDEBAR}
          onChange={onAcademicYearChange}
          disabled={disabled}
          size="md"
          icon={CalendarRange}
          className="w-full min-w-0"
        />
      </ScopeField>
      <div className="grid grid-cols-2 gap-2">
        <ScopeField label="Branch">
          <Select<Branch>
            value={branch}
            options={BRANCH_OPTIONS}
            onChange={onBranchChange}
            disabled={disabled}
            size="md"
            className="w-full min-w-0"
          />
        </ScopeField>
        <ScopeField label="Semester">
          <Select<Semester>
            value={semester}
            options={SEMESTER_OPTIONS_SHORT}
            onChange={onSemesterChange}
            disabled={disabled}
            size="md"
            searchable={false}
            className="w-full min-w-0"
          />
        </ScopeField>
      </div>
    </div>
  );
}

function ScopeField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted/70">
          {label}
        </span>
        {hint && (
          <span className="text-2xs font-medium text-muted/80 truncate">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
