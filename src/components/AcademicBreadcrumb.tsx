"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface AcademicCrumb {
  label: string;
  href?: string;
}

interface AcademicBreadcrumbProps {
  branch: string;
  semester: number | string;
  crumbs: AcademicCrumb[];
  className?: string;
}

/**
 * Shared trail for academic pages: Branch · Sem / Page / Subject
 */
export default function AcademicBreadcrumb({
  branch,
  semester,
  crumbs,
  className = "",
}: AcademicBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1 text-xs text-muted ${className}`}
    >
      <span className="font-medium text-foreground/80">
        {branch} · Sem {semester}
      </span>
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="contents">
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="font-medium hover:text-foreground transition-colors truncate max-w-[12rem]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="font-semibold text-foreground truncate max-w-[12rem]">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
