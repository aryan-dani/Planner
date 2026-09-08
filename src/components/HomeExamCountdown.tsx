"use client";

import { useMemo } from "react";
import AppLink from "@/components/ui/AppLink";
import { CalendarCheck } from "lucide-react";
import { getSoonestUpcomingExam } from "@/lib/examCountdown";
import { useIsClient } from "@/lib/clientHooks";

export default function HomeExamCountdown() {
  const mounted = useIsClient();
  const exam = useMemo(
    () => (mounted ? getSoonestUpcomingExam() : null),
    [mounted],
  );

  if (!exam) return null;

  const label =
    exam.daysUntil === 0
      ? "Exam today"
      : exam.daysUntil === 1
        ? "Exam tomorrow"
        : `Exam in ${exam.daysUntil} days`;

  return (
    <AppLink
      href="/planner"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface transition-colors"
      title={exam.text}
    >
      <CalendarCheck className="w-3.5 h-3.5 text-muted shrink-0" />
      <span>{label}</span>
      <span className="text-muted font-medium truncate max-w-[12rem]">
        · {exam.text}
      </span>
    </AppLink>
  );
}
