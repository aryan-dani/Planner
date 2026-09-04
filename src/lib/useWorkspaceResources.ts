"use client";

import { useEffect, useState } from "react";
import type { ResourceItem } from "@/lib/dataFetcher";
import { useAcademicStore } from "@/store/academicStore";

export type WorkspaceResourcesState = {
  resources: ResourceItem[];
  subjects: string[];
  syllabusUrl: string | null;
  loading: boolean;
  error: string | null;
  academicYear: string;
  branch: string;
  semester: number;
};

type CacheEntry = {
  resources: ResourceItem[];
  subjects: string[];
  syllabusUrl: string | null;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

function cacheKey(year: string, branch: string, semester: number): string {
  return `${year}:${branch}:${semester}`;
}

function deriveSubjects(resources: ResourceItem[]): string[] {
  return Array.from(
    new Set(
      resources
        .map((r) => r.subject_name)
        .filter((name): name is string => typeof name === "string" && name.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function deriveSyllabusUrl(resources: ResourceItem[]): string | null {
  const hit = resources.find((r) => {
    const t = r.title.toLowerCase();
    return t.includes("syllabus") && !t.includes("notes");
  });
  return hit?.file_url ?? null;
}

async function loadWorkspace(
  academicYear: string,
  branch: string,
  semester: number,
): Promise<CacheEntry> {
  const key = cacheKey(academicYear, branch, semester);
  const hit = cache.get(key);
  if (hit) return hit;

  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(
      `/api/resources/list?year=${encodeURIComponent(academicYear)}&branch=${encodeURIComponent(branch)}&semester=${semester}`,
    );
    if (!res.ok) throw new Error("Failed to load resources");
    const data = await res.json();
    const resources: ResourceItem[] = Array.isArray(data.resources)
      ? data.resources
      : [];
    const entry: CacheEntry = {
      resources,
      subjects: deriveSubjects(resources),
      syllabusUrl: deriveSyllabusUrl(resources),
    };
    cache.set(key, entry);
    return entry;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/** Client-side workspace catalog with module-level cache (shared across Resources/Ask/Syllabus). */
export function useWorkspaceResources(): WorkspaceResourcesState {
  const { academicYear, branch, semester } = useAcademicStore();
  const key = cacheKey(academicYear, branch, semester);
  const cached = cache.get(key);

  const [resources, setResources] = useState<ResourceItem[]>(
    cached?.resources ?? [],
  );
  const [subjects, setSubjects] = useState<string[]>(cached?.subjects ?? []);
  const [syllabusUrl, setSyllabusUrl] = useState<string | null>(
    cached?.syllabusUrl ?? null,
  );
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hit = cache.get(key);
    if (hit) {
      setResources(hit.resources);
      setSubjects(hit.subjects);
      setSyllabusUrl(hit.syllabusUrl);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    loadWorkspace(academicYear, branch, semester)
      .then((entry) => {
        if (cancelled) return;
        setResources(entry.resources);
        setSubjects(entry.subjects);
        setSyllabusUrl(entry.syllabusUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, academicYear, branch, semester]);

  return {
    resources,
    subjects,
    syllabusUrl,
    loading,
    error,
    academicYear,
    branch,
    semester,
  };
}
