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
