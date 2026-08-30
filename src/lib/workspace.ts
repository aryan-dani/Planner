import type { Branch, Semester } from "@/lib/academic/scope";
import {
  BRANCH_SET,
  SEMESTER_SET,
} from "@/lib/academic/scope";

export type { Branch, Semester };

/** Fallback when URL, prefs, and localStorage are all empty. */
export const DEFAULT_BRANCH: Branch = "AIDS";
export const DEFAULT_SEMESTER: Semester = 5;

export const WORKSPACE_STORAGE_KEY = "utility-workspace";

export function parseBranch(value: string | null | undefined): Branch | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return BRANCH_SET.has(upper) ? (upper as Branch) : null;
}

export function parseSemester(
  value: string | number | null | undefined,
): Semester | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || !SEMESTER_SET.has(num)) return null;
  return num as Semester;
}

export type WorkspacePrefs = {
  branch?: string | null;
  semester?: string | number | null;
};

export type ResolvedWorkspace = {
  branch: Branch;
  semester: Semester;
};

/** Resolve workspace: URL params win, then prefs, then defaults. */
export function resolveWorkspace(
  params: { branch?: string | null; semester?: string | null },
  prefs?: WorkspacePrefs | null,
): ResolvedWorkspace {
  const branch =
    parseBranch(params.branch) ??
    parseBranch(prefs?.branch) ??
    DEFAULT_BRANCH;
  const semester =
    parseSemester(params.semester) ??
    parseSemester(prefs?.semester) ??
    DEFAULT_SEMESTER;
  return { branch, semester };
}

export function readStoredWorkspace(): WorkspacePrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspacePrefs;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredWorkspace(branch: Branch, semester: Semester): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ branch, semester }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** Safe same-origin path for post-login redirects. */
export function sanitizeRedirectTo(
  value: string | null | undefined,
  fallback = "/planner",
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  return trimmed;
}

export function workspaceQuery(branch: Branch, semester: Semester): string {
  return `branch=${encodeURIComponent(branch)}&semester=${semester}`;
}
