import { ResourceCategory } from "@/lib/dataFetcher";

export type ResourceFilter = "all" | ResourceCategory;

const FILTER_VALUES = new Set<string>([
  "all",
  "notes",
  "question-bank",
  "solved-question-bank",
  "ppt",
  "pyq",
  "writeup",
  "codes",
  "other",
]);

export function parseResourceFilter(
  value: string | null | undefined,
): ResourceFilter {
  if (!value) return "all";
  const normalized = value.toLowerCase();
  return FILTER_VALUES.has(normalized)
    ? (normalized as ResourceFilter)
    : "all";
}

/** Match a URL subject slug to a real subject name (case-insensitive). */
export function resolveSubjectName(
  slug: string | null | undefined,
  subjectNames: string[],
): string | null {
  if (!slug || subjectNames.length === 0) return null;
  const decoded = decodeURIComponent(slug).trim();
  if (!decoded) return null;
  const exact = subjectNames.find((name) => name === decoded);
  if (exact) return exact;
  const lower = decoded.toLowerCase();
  return subjectNames.find((name) => name.toLowerCase() === lower) ?? null;
}

export function subjectToSlug(subject: string): string {
  return encodeURIComponent(subject);
}

/** Normalize folder deep-link ids: assignment-1, unit-2, year-2024, other */
export function parseResourceFolder(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const normalized = decodeURIComponent(value).trim().toLowerCase();
  if (!normalized) return null;
  if (
    /^(assignment-[\da-z]+|unit-\d+|year-\d{4}|other)$/i.test(normalized)
  ) {
    return normalized;
  }
  return null;
}

export function buildResourcesHref(opts: {
  branch: string;
  semester: number | string;
  subject?: string | null;
  filter?: ResourceFilter | null;
  folder?: string | null;
  view?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("branch", opts.branch);
  params.set("semester", String(opts.semester));
  if (opts.subject) params.set("subject", subjectToSlug(opts.subject));
  if (opts.filter && opts.filter !== "all") params.set("filter", opts.filter);
  if (opts.folder) params.set("folder", opts.folder);
  if (opts.view) params.set("view", opts.view);
  return `/resources?${params.toString()}`;
}
