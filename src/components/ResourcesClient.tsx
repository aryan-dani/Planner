"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ResourceItem } from "@/lib/dataFetcher";
import { useAcademicStore } from "@/store/academicStore";
import { isSubjectMatch } from "@/lib/subjectMatcher";
import { motion } from "framer-motion";
import {
  HardDrive,
  BookOpenCheck,
  FileText,
  FileSpreadsheet,
  Folder,
  Layers,
  Search,
  PenTool,
  Brain,
  CheckCircle2,
  Code2,
  Loader2,
  ChevronRight,
  ClipboardList,
  Clock,
  Star,
} from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import ResourceSection from "./resources/ResourceSection";
import { cleanResourceTitle } from "@/lib/titleUtils";
import { NotesDisclaimer } from "./NotesDisclaimer";
import { isDatasetResource } from "@/lib/resourceLinks";
import { auth } from "@/lib/firebase";
import {
  groupByAssignment,
  groupByUnit,
  groupByYear,
  subjectSummaryCounts,
  folderIdForResource,
  folderLabelFromId,
  findAssignmentSiblings,
  folderScopeSubject,
  subjectFolderScope,
} from "@/lib/resourceGroups";
import {
  resolveSubjectName,
  subjectToSlug,
  parseResourceFilter,
  parseResourceFolder,
  buildResourcesHref,
  pageFromSectionLabel,
  type ResourceFilter,
} from "@/lib/resourceUrl";
import {
  getRecentResources,
  pushRecentResource,
  type RecentResource,
} from "@/lib/recentResources";
import {
  getFavoriteResources,
  toggleFavoriteResource,
  type FavoriteResource,
} from "@/lib/favoriteResources";
import { getReadingProgress } from "@/lib/readingProgress";
import { authFetch } from "@/lib/authFetch";
import { useWorkspaceResources } from "@/lib/useWorkspaceResources";
import { Button, Card, Badge } from "@/components/ui";
import PageSkeleton from "@/components/PageSkeleton";

const ResourceViewer = dynamic(() => import("./ResourceViewer"), { ssr: false });
const SummaryModal = dynamic(() => import("./SummaryModal"), { ssr: false });

const RESOURCE_FILTERS: { value: ResourceFilter; label: string; Icon: any }[] =
  [
    { value: "all", label: "All", Icon: Layers },
    { value: "notes", label: "Notes", Icon: FileText },
    { value: "question-bank", label: "Question Banks", Icon: BookOpenCheck },
    { value: "ppt", label: "Presentations", Icon: FileSpreadsheet },
    { value: "pyq", label: "PYQ", Icon: FileText },
    { value: "writeup", label: "Writeups", Icon: PenTool },
    { value: "codes", label: "Codes", Icon: Code2 },
  ];

function isAssignmentCategory(category: string): boolean {
  return category === "writeup" || category === "codes";
}

function filterLabel(filter: ResourceFilter): string | null {
  if (filter === "all") return null;
  if (filter === "writeup" || filter === "codes") return "Assignments";
  const match = RESOURCE_FILTERS.find((f) => f.value === filter);
  return match?.label ?? filter;
}

export default function ResourcesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery, aiSearchQuery, setAiSearchQuery } =
    useAcademicStore();
  const {
    resources,
    loading: catalogLoading,
    academicYear,
    branch,
    semester,
  } = useWorkspaceResources();

  const initialFilter = parseResourceFilter(searchParams.get("filter"));
  const initialView = searchParams.get("view");
  const initialFolder = searchParams.get("folder");
  const initialSubject = searchParams.get("subject");

  // Defaults only for first paint — URL deep-links apply in useEffect after mount
  // so static SSR (empty searchParams) matches the client hydration pass.
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ResourceFilter>("all");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [viewerResource, setViewerResource] = useState<ResourceItem | null>(
    null,
  );
  const [viewerPage, setViewerPage] = useState<number | null>(null);
  const [recentResources, setRecentResources] = useState<RecentResource[]>([]);
  const [favoriteResources, setFavoriteResources] = useState<FavoriteResource[]>(
    [],
  );
  const [summarizingResource, setSummarizingResource] =
    useState<ResourceItem | null>(null);
  const [contentResults, setContentResults] = useState<any[]>([]);
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const didOpenInitialView = useRef(false);
  const didHydrateFromUrl = useRef(false);
  const skipFolderUrlHydrate = useRef(true);
  const lastUserSubjectRef = useRef<string | null>(null);
  const [isSubjectPending, setIsSubjectPending] = useState(false);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const scopeKey = `${academicYear}:${branch}:${semester}`;
  const prevScopeRef = useRef(scopeKey);
  const subjectPendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);

  useEffect(() => {
    if (prevScopeRef.current === scopeKey) return;
    prevScopeRef.current = scopeKey;
    didHydrateFromUrl.current = false;
    lastUserSubjectRef.current = null;
    didOpenInitialView.current = false;
    setSelectedFilter("all");
    setActiveFolderId(null);
    setViewerResource(null);
    setIsScopeLoading(true);
  }, [scopeKey]);

  useEffect(() => {
    if (!catalogLoading) setIsScopeLoading(false);
  }, [catalogLoading, resources]);

  useEffect(() => {
    return () => {
      if (subjectPendingTimer.current) clearTimeout(subjectPendingTimer.current);
    };
  }, []);

  const syncUrl = useCallback(
    (next: {
      subject?: string | null;
      filter?: ResourceFilter;
      view?: string | null;
      folder?: string | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", academicYear);
      params.set("branch", branch);
      params.set("semester", String(semester));

      const subject =
        next.subject !== undefined ? next.subject : selectedSubject;
      const filter = next.filter !== undefined ? next.filter : selectedFilter;
      const view =
        next.view !== undefined ? next.view : (viewerResource?.id ?? null);
      const folder =
        next.folder !== undefined ? next.folder : activeFolderId;

      if (subject) params.set("subject", subjectToSlug(subject));
      else params.delete("subject");

      if (filter && filter !== "all") params.set("filter", filter);
      else params.delete("filter");

      if (folder) params.set("folder", folder);
      else params.delete("folder");

      if (view) params.set("view", view);
      else params.delete("view");

      const current = new URLSearchParams(searchParams.toString());
      current.set("branch", branch);
      current.set("semester", String(semester));
      if (
        current.get("subject") === params.get("subject") &&
        current.get("filter") === params.get("filter") &&
        current.get("folder") === params.get("folder") &&
        current.get("view") === params.get("view") &&
        current.get("branch") === params.get("branch") &&
        current.get("semester") === params.get("semester")
      ) {
        return;
      }

      const nextQs = params.toString();
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, {
        scroll: false,
      });
    },
    [
      searchParams,
      branch,
      semester,
      selectedSubject,
      selectedFilter,
      activeFolderId,
      viewerResource?.id,
      router,
      pathname,
    ],
  );

  const subjectsMap = useMemo(
    () =>
      resources.reduce(
        (acc, resource) => {
          if (!acc[resource.subject_name]) acc[resource.subject_name] = [];
          acc[resource.subject_name].push(resource);
          return acc;
        },
        {} as Record<string, ResourceItem[]>,
      ),
    [resources],
  );

  const subjectNames = useMemo(
    () => Object.keys(subjectsMap).sort(),
    [subjectsMap],
  );

  const filteredSubjectNames = useMemo(() => {
    if (!searchQuery.trim()) return subjectNames;
    const q = searchQuery.toLowerCase();
    return subjectNames.filter((name) => {
      const subjResources = subjectsMap[name] ?? [];
      return (
        name.toLowerCase().includes(q) ||
        isSubjectMatch(name, searchQuery) ||
        subjResources.some((r) => r.title.toLowerCase().includes(q))
      );
    });
  }, [subjectNames, subjectsMap, searchQuery]);

  const selectSubject = useCallback(
    (subjectName: string, opts?: { filter?: ResourceFilter; fromUser?: boolean }) => {
      const filter = opts?.filter ?? "all";
      const fromUser = opts?.fromUser ?? true;

      if (fromUser) {
        lastUserSubjectRef.current = subjectName;
        setIsSubjectPending(true);
        if (subjectPendingTimer.current) clearTimeout(subjectPendingTimer.current);
        subjectPendingTimer.current = setTimeout(() => setIsSubjectPending(false), 180);
      }

      setSelectedSubject(subjectName);
      setSelectedFilter(filter);
      setActiveFolderId(null);
      setViewerResource(null);
      syncUrl({ subject: subjectName, filter, view: null, folder: null });
    },
    [syncUrl],
  );

  useEffect(() => {
    if (filteredSubjectNames.length === 0) {
      setSelectedSubject(null);
      return;
    }

    const urlSlug = searchParams.get("subject");
    const fromLiveUrl = resolveSubjectName(urlSlug, filteredSubjectNames);
    const userPick = lastUserSubjectRef.current;

    if (userPick) {
      if (filteredSubjectNames.includes(userPick)) {
        if (selectedSubject !== userPick) setSelectedSubject(userPick);
        if (fromLiveUrl === userPick || subjectToSlug(userPick) === urlSlug) {
          lastUserSubjectRef.current = null;
        }
        return;
      }
      lastUserSubjectRef.current = null;
    }

    if (!didHydrateFromUrl.current) {
      didHydrateFromUrl.current = true;
      const fromInitial = resolveSubjectName(initialSubject, filteredSubjectNames);
      const target = fromLiveUrl || fromInitial || filteredSubjectNames[0];
      if (selectedSubject !== target) setSelectedSubject(target);
      const urlFilter = parseResourceFilter(searchParams.get("filter") || initialFilter);
      setSelectedFilter(urlFilter);
      const urlFolder = parseResourceFolder(
        searchParams.get("folder") || initialFolder,
      );
      if (urlFolder) setActiveFolderId(urlFolder);
      return;
    }

    if (fromLiveUrl) {
      if (selectedSubject !== fromLiveUrl) {
        setSelectedSubject(fromLiveUrl);
        const urlFilter = parseResourceFilter(searchParams.get("filter"));
        setSelectedFilter(urlFilter);
      }
      return;
    }

    if (selectedSubject && filteredSubjectNames.includes(selectedSubject)) {
      return;
    }

    setSelectedSubject(filteredSubjectNames[0]);
    setSelectedFilter("all");
    setActiveFolderId(null);
  }, [
    filteredSubjectNames,
    selectedSubject,
    initialSubject,
    initialFilter,
    initialFolder,
    searchParams,
  ]);

  // Mirror ?folder= only when that query value changes (back/forward, shared link).
  // Do not re-apply a stale param just because local activeFolderId changed — that
  // re-opens a unit the user just collapsed.
  const urlFolderParam = searchParams.get("folder");
  useEffect(() => {
    if (skipFolderUrlHydrate.current) {
      skipFolderUrlHydrate.current = false;
      return;
    }
    const urlFolder = parseResourceFolder(urlFolderParam);
    if (!urlFolder) {
      setActiveFolderId((prev) => (prev === null ? prev : null));
      return;
    }
    if (selectedSubject) {
      const scope = folderScopeSubject(urlFolder);
      const subjectScope = subjectFolderScope(selectedSubject);
      if (scope && scope !== subjectScope) {
        setActiveFolderId(null);
        return;
      }
    }
    setActiveFolderId((prev) => (prev === urlFolder ? prev : urlFolder));
  }, [urlFolderParam, selectedSubject]);

  useEffect(() => {
    if (!selectedSubject || selectedFilter === "all") return;
    const items = subjectsMap[selectedSubject] ?? [];
    const hasItems =
      selectedFilter === "question-bank"
        ? items.some(
            (r) =>
              r.category === "question-bank" ||
              r.category === "solved-question-bank",
          )
        : selectedFilter === "writeup" || selectedFilter === "codes"
          ? items.some(
              (r) =>
                isAssignmentCategory(r.category) || isDatasetResource(r),
            )
          : items.some((r) => r.category === selectedFilter);
    if (!hasItems) setSelectedFilter("all");
  }, [selectedSubject, selectedFilter, subjectsMap]);

  useEffect(() => {
    if (didOpenInitialView.current) return;
    const viewId = initialView || searchParams.get("view");
    if (!viewId) return;
    const match = resources.find((r) => r.id === viewId);
    if (match) {
      didOpenInitialView.current = true;
      setViewerResource(match);
      const pageRaw = searchParams.get("page");
      const pageNum = pageRaw ? Number(pageRaw) : NaN;
      setViewerPage(Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null);
      setRecentResources(
        pushRecentResource(match, { academicYear, branch, semester }),
      );
      if (match.subject_name) {
        lastUserSubjectRef.current = match.subject_name;
        setSelectedSubject(match.subject_name);
      }
      const folder = folderIdForResource(match);
      if (folder) setActiveFolderId(folder);
      if (isAssignmentCategory(match.category) || isDatasetResource(match)) {
        // Keep All or Codes/Writeups — prefer codes filter only if URL says so
        if (!searchParams.get("filter")) {
          // leave as-is / all so Assignments explorer shows
        }
      }
    }
  }, [initialView, searchParams, resources, academicYear, branch, semester]);

  useEffect(() => {
    setRecentResources(getRecentResources());
    setFavoriteResources(getFavoriteResources());
  }, []);

  const favoriteIds = useMemo(
    () => new Set(favoriteResources.map((f) => f.id)),
    [favoriteResources],
  );

  const handleFavorite = useCallback(
    (item: ResourceItem) => {
      const next = toggleFavoriteResource(item, {
        academicYear,
        branch,
        semester,
      });
      setFavoriteResources(next);
      toast.success(
        next.some((f) => f.id === item.id)
          ? "Added to favorites"
          : "Removed from favorites",
      );
    },
    [academicYear, branch, semester],
  );

  useEffect(() => {
    if (!selectedSubject) return;
    if (lastUserSubjectRef.current && lastUserSubjectRef.current !== selectedSubject) {
      return;
    }
    syncUrl({
      subject: selectedSubject,
      filter: selectedFilter,
      view: viewerResource?.id ?? null,
      folder: activeFolderId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedFilter, viewerResource?.id, activeFolderId]);

  const openResource = useCallback(
    (item: ResourceItem, page?: number | null) => {
      const folder = folderIdForResource(item);
      if (folder) setActiveFolderId(folder);
      setViewerResource(item);
      const explicit = page && page > 0 ? page : null;
      const saved = explicit ? null : getReadingProgress(item.id);
      setViewerPage(explicit ?? saved);
      setRecentResources(
        pushRecentResource(item, { academicYear, branch, semester }),
      );
    },
    [academicYear, branch, semester],
  );

  const shareResource = useCallback(
    async (item: ResourceItem) => {
      const href = buildResourcesHref({
        academicYear,
        branch,
        semester,
        subject: item.subject_name,
        view: item.id,
        folder: folderIdForResource(item),
      });
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}${href}`
          : href;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied");
      } catch {
        toast.error("Could not copy link");
      }
    },
    [academicYear, branch, semester],
  );

  const closeViewer = useCallback(() => {
    setViewerResource(null);
    setViewerPage(null);
  }, []);

  const handleFolderChange = useCallback((folderId: string | null) => {
    setActiveFolderId(folderId);
  }, []);

  const handleVaultSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (value.trim().length >= 3) {
        setAiSearchQuery(value.trim());
      } else {
        setAiSearchQuery("");
      }
    },
    [setSearchQuery, setAiSearchQuery],
  );

  useEffect(() => {
    if (!aiSearchQuery.trim() || aiSearchQuery.length < 3) {
      setContentResults([]);
      setIsSearchingContent(false);
      return;
    }

    const abortController = new AbortController();
    const requestId = ++searchRequestId.current;
    const timer = setTimeout(async () => {
      try {
        setIsSearchingContent(true);
        const user = auth.currentUser;
        if (!user) {
          if (searchRequestId.current === requestId) {
            setContentResults([]);
            setIsSearchingContent(false);
            toast.message("Sign in for content search");
          }
          return;
        }
        const params = new URLSearchParams({
          q: aiSearchQuery,
          year: academicYear,
          branch,
          semester: String(semester),
        });
        const res = await authFetch(`/api/search?${params.toString()}`, {
          signal: abortController.signal,
        });
        if (!res.ok) {
          if (searchRequestId.current === requestId) setContentResults([]);
          return;
        }
        const data = await res.json();
        if (searchRequestId.current === requestId) {
          setContentResults(data.results || []);
        }
      } catch (err: unknown) {
        const name = err instanceof Error ? err.name : "";
        if (name !== "AbortError") {
          console.error("Content search error:", err);
        }
      } finally {
        if (searchRequestId.current === requestId) {
          setIsSearchingContent(false);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [aiSearchQuery, academicYear, branch, semester]);

  const searchedResources = useMemo(() => {
    const all = selectedSubject ? (subjectsMap[selectedSubject] ?? []) : [];
    if (!searchQuery.trim()) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subject_name.toLowerCase().includes(q) ||
        isSubjectMatch(r.subject_name, searchQuery),
    );
  }, [selectedSubject, subjectsMap, searchQuery]);

  /** For Codes/Writeups filters, include sibling assignment files so notebooks keep datasets. */
  const filteredResources = useMemo(() => {
    if (selectedFilter === "all") return searchedResources;
    if (selectedFilter === "question-bank") {
      return searchedResources.filter(
        (r) =>
          r.category === "question-bank" ||
          r.category === "solved-question-bank",
      );
    }
    if (selectedFilter === "writeup" || selectedFilter === "codes") {
      // Include all assignment-related files so folders stay complete
      return searchedResources.filter(
        (r) =>
          isAssignmentCategory(r.category) || isDatasetResource(r),
      );
    }
    return searchedResources.filter((r) => r.category === selectedFilter);
  }, [searchedResources, selectedFilter]);

  const filterCounts = useMemo(
    () =>
      RESOURCE_FILTERS.reduce(
        (acc, filter) => {
          if (filter.value === "all") {
            acc[filter.value] = searchedResources.length;
          } else if (filter.value === "question-bank") {
            acc[filter.value] = searchedResources.filter(
              (r) =>
                r.category === "question-bank" ||
                r.category === "solved-question-bank",
            ).length;
          } else if (filter.value === "writeup" || filter.value === "codes") {
            acc[filter.value] = searchedResources.filter(
              (r) =>
                isAssignmentCategory(r.category) || isDatasetResource(r),
            ).length;
          } else {
            acc[filter.value] = searchedResources.filter(
              (r) => r.category === filter.value,
            ).length;
          }
          return acc;
        },
        {} as Record<ResourceFilter, number>,
      ),
    [searchedResources],
  );

  const assignmentItems = useMemo(
    () =>
      filteredResources.filter(
        (r) => isAssignmentCategory(r.category) || isDatasetResource(r),
      ),
    [filteredResources],
  );

  const assignmentFolders = useMemo(
    () =>
      groupByAssignment(assignmentItems, selectedSubject ?? undefined),
    [assignmentItems, selectedSubject],
  );

  const notesFolders = useMemo(
    () =>
      groupByUnit(
        filteredResources.filter((r) => r.category === "notes"),
        selectedSubject ?? undefined,
      ),
    [filteredResources, selectedSubject],
  );

  const pptFolders = useMemo(
    () =>
      groupByUnit(
        filteredResources.filter((r) => r.category === "ppt"),
        selectedSubject ?? undefined,
      ),
    [filteredResources, selectedSubject],
  );

  const pyqFolders = useMemo(
    () =>
      groupByYear(
        filteredResources.filter((r) => r.category === "pyq"),
        selectedSubject ?? undefined,
      ),
    [filteredResources, selectedSubject],
  );

  const qbItems = useMemo(
    () =>
      filteredResources.filter(
        (r) =>
          r.category === "question-bank" ||
          r.category === "solved-question-bank",
      ),
    [filteredResources],
  );

  const otherItems = useMemo(
    () =>
      filteredResources.filter(
        (r) =>
          r.category === "other" &&
          !isDatasetResource(r),
      ),
    [filteredResources],
  );

  const summary = useMemo(
    () => subjectSummaryCounts(searchedResources),
    [searchedResources],
  );

  const summaryHint = useMemo(() => {
    const parts: string[] = [];
    if (summary.assignments > 0) {
      parts.push(
        `${summary.assignments} assignment${summary.assignments === 1 ? "" : "s"}`,
      );
    }
    if (summary.notes > 0) {
      parts.push(`${summary.notes} note${summary.notes === 1 ? "" : "s"}`);
    }
    if (summary.ppt > 0) {
      parts.push(`${summary.ppt} PPT${summary.ppt === 1 ? "" : "s"}`);
    }
    if (summary.pyq > 0) {
      parts.push(`${summary.pyq} PYQ`);
    }
    if (summary.qb > 0) {
      parts.push(`${summary.qb} QB`);
    }
    return parts.join(" · ");
  }, [summary]);

  const viewerSiblings = useMemo(
    () =>
      viewerResource
        ? findAssignmentSiblings(viewerResource, resources)
        : [],
    [viewerResource, resources],
  );

  const breadcrumbFolderLabel = folderLabelFromId(activeFolderId);
  const breadcrumbFilterLabel =
    filterLabel(selectedFilter) ||
    (activeFolderId?.startsWith("assignment-")
      ? "Assignments"
      : activeFolderId?.startsWith("unit-")
        ? selectedFilter === "ppt"
          ? "Presentations"
          : "Notes"
        : activeFolderId?.startsWith("year-")
          ? "PYQ"
          : null);

  const showAssignments =
    selectedFilter === "all" ||
    selectedFilter === "writeup" ||
    selectedFilter === "codes";
  const showNotes = selectedFilter === "all" || selectedFilter === "notes";
  const showPpt = selectedFilter === "all" || selectedFilter === "ppt";
  const showPyq = selectedFilter === "all" || selectedFilter === "pyq";
  const showQb =
    selectedFilter === "all" || selectedFilter === "question-bank";
  const showOther = selectedFilter === "all" || selectedFilter === "other";

  if (catalogLoading && resources.length === 0) {
    return <PageSkeleton variant="split" />;
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto page-gutter py-8 min-h-[80vh]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Resource Vault
          </h1>
          <p className="text-muted text-sm mt-1">
            {branch} · Semester {semester} · {resources.length} files
          </p>
        </div>
      </div>

      {/* Breadcrumb trail */}
      <nav
        aria-label="Resource location"
        className="flex flex-wrap items-center gap-1 text-xs text-muted mb-4"
      >
        <span className="font-medium text-foreground/80">
          {branch} · Sem {semester}
        </span>
        {selectedSubject && (
          <>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <button
              type="button"
              onClick={() => {
                setSelectedFilter("all");
                setActiveFolderId(null);
              }}
              className="font-medium hover:text-foreground transition-colors truncate max-w-[10rem]"
            >
              {selectedSubject}
            </button>
          </>
        )}
        {breadcrumbFilterLabel && (
          <>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <button
              type="button"
              onClick={() => setActiveFolderId(null)}
              className="font-medium hover:text-foreground transition-colors"
            >
              {breadcrumbFilterLabel}
            </button>
          </>
        )}
        {breadcrumbFolderLabel && (
          <>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold text-foreground truncate max-w-[12rem]">
              {breadcrumbFolderLabel}
            </span>
          </>
        )}
        <span className="hidden sm:inline mx-2 text-border">|</span>
        <Link
          href={`/syllabus?year=${encodeURIComponent(academicYear)}&branch=${branch}&semester=${semester}`}
          className="hidden sm:inline hover:text-foreground transition-colors"
        >
          Syllabus
        </Link>
        <span className="hidden sm:inline text-border">·</span>
        <Link
          href={`/ask?year=${encodeURIComponent(academicYear)}&branch=${branch}&semester=${semester}`}
          className="hidden sm:inline hover:text-foreground transition-colors"
        >
          Ask AI
        </Link>
      </nav>

      <NotesDisclaimer className="mb-8" />

      <div className="border-b border-border mb-8" />

      {resources.length === 0 ? (
        <Card
          padding="lg"
          className="flex flex-col items-center justify-center p-16 text-center border-dashed bg-surface"
        >
          <Folder className="w-10 h-10 text-muted/40 mb-3" />
          <p className="text-base font-semibold text-foreground mb-1">
            No Files Found
          </p>
          <p className="text-sm text-muted">
            No resources uploaded for {branch} Semester {semester} yet.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <Card
            padding="none"
            className="w-full md:w-60 shrink-0 shadow-sm overflow-hidden md:sticky md:top-24 z-10"
          >
            <div className="px-4 py-3 border-b border-border bg-surface/50 flex items-center justify-between">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted">
                Subjects
              </h3>
              <Badge>{filteredSubjectNames.length}</Badge>
            </div>
            <div className="flex flex-col max-h-[65vh] overflow-y-auto scrollbar-none p-2 gap-0.5 relative">
              {filteredSubjectNames.map((subjectName) => {
                const isActive = selectedSubject === subjectName;
                const subjectResources = subjectsMap[subjectName] ?? [];
                return (
                  <button
                    key={subjectName}
                    onClick={() => selectSubject(subjectName)}
                    className={`group flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-sm rounded-lg relative ${
                      isActive
                        ? "text-background font-medium shadow-sm"
                        : "text-muted hover:text-foreground hover:bg-surface/60"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSubject"
                        className="absolute inset-0 bg-foreground rounded-lg -z-10"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                    <Folder
                      className={`w-4 h-4 flex-shrink-0 z-10 ${isActive ? "text-background" : "text-muted group-hover:text-foreground"}`}
                    />
                    <span className="flex-1 truncate text-[13px] z-10">
                      {subjectName}
                    </span>
                    <Badge
                      variant={isActive ? "active" : "default"}
                      className={`z-10 text-[10px] ${isActive ? "bg-background/20 text-background border-transparent" : ""}`}
                    >
                      {subjectResources.length}
                    </Badge>
                  </button>
                );
              })}
              {filteredSubjectNames.length === 0 && (
                <p className="px-4 py-8 text-sm text-muted text-center font-medium">
                  No subjects match.
                </p>
              )}
            </div>
          </Card>

          <div className="flex-1 w-full min-w-0 relative">
            {(isSubjectPending || isScopeLoading) && (
              <div
                className="absolute inset-0 z-20 rounded-2xl bg-background/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3"
                role="status"
                aria-live="polite"
              >
                <span className="loading-orb" aria-hidden />
                <p className="text-xs font-medium text-muted tracking-wide">
                  {isScopeLoading ? "Loading semester…" : "Switching subject…"}
                </p>
              </div>
            )}
            {selectedSubject && subjectsMap[selectedSubject] ? (
              <motion.div
                key={selectedSubject}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isSubjectPending ? 0.55 : 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-8"
              >
                {favoriteResources.length > 0 && (
                  <div className="rounded-xl border border-border/70 bg-surface/40 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Star className="w-3.5 h-3.5 text-muted" />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        Favorites
                      </p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                      {favoriteResources.slice(0, 8).map((r) => {
                        const live = resources.find((x) => x.id === r.id);
                        const resume = getReadingProgress(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              if (live) openResource(live);
                              else if (r.subject_name) {
                                lastUserSubjectRef.current = r.subject_name;
                                setSelectedSubject(r.subject_name);
                              }
                            }}
                            className="shrink-0 max-w-[11rem] rounded-lg border border-border bg-card px-2.5 py-2 text-left hover:bg-surface-hover transition-colors"
                            title={cleanResourceTitle(r.title)}
                          >
                            <p className="text-xs font-medium text-foreground truncate">
                              {cleanResourceTitle(r.title)}
                            </p>
                            <p className="text-[10px] text-muted truncate mt-0.5">
                              {r.subject_name}
                              {resume ? ` · Resume p.${resume}` : ""}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recentResources.length > 0 && (
                  <div className="rounded-xl border border-border/70 bg-surface/40 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5 text-muted" />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        Recently viewed
                      </p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                      {recentResources.slice(0, 8).map((r) => {
                        const live = resources.find((x) => x.id === r.id);
                        const resume = getReadingProgress(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              if (live) openResource(live);
                              else if (r.subject_name) {
                                lastUserSubjectRef.current = r.subject_name;
                                setSelectedSubject(r.subject_name);
                              }
                            }}
                            className="shrink-0 max-w-[11rem] rounded-lg border border-border bg-card px-2.5 py-2 text-left hover:bg-surface-hover transition-colors"
                            title={cleanResourceTitle(r.title)}
                          >
                            <p className="text-xs font-medium text-foreground truncate">
                              {cleanResourceTitle(r.title)}
                            </p>
                            <p className="text-[10px] text-muted truncate mt-0.5">
                              {r.subject_name}
                              {resume ? ` · Resume p.${resume}` : ""}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4 border-b border-border pb-5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-foreground tracking-tight">
                        {selectedSubject}
                      </h2>
                      {(searchQuery || selectedFilter !== "all") && (
                        <div className="flex items-center gap-2">
                          <Badge>
                            {filteredResources.length}{" "}
                            {filteredResources.length !== 1
                              ? "results"
                              : "result"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleVaultSearch("");
                              setSelectedFilter("all");
                              setActiveFolderId(null);
                            }}
                            className="underline underline-offset-4"
                          >
                            Clear filters
                          </Button>
                        </div>
                      )}
                    </div>
                    {summaryHint && (
                      <p className="text-xs text-muted font-medium">
                        {summaryHint}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => handleVaultSearch(e.target.value)}
                      placeholder="Search files… (3+ chars for content match)"
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
                      aria-label="Search vault"
                    />
                  </div>

                  <div
                    key={selectedSubject}
                    className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-none relative"
                  >
                    {RESOURCE_FILTERS.map(({ value, label, Icon }) => {
                      const count = filterCounts[value] ?? 0;
                      const active = selectedFilter === value;
                      if (value !== "all" && count === 0) return null;
                      return (
                        <Button
                          key={value}
                          variant={active ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => {
                            setSelectedFilter(value);
                            setActiveFolderId(null);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap flex-shrink-0 relative min-h-0 ${
                            active ? "border-transparent shadow-sm" : ""
                          }`}
                        >
                          {active && (
                            <motion.div
                              layoutId="activeFilter"
                              className="absolute inset-0 bg-foreground rounded-lg -z-10"
                              transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 30,
                              }}
                            />
                          )}
                          <Icon
                            className={`w-3 h-3 z-10 ${active ? "text-background" : "text-muted"}`}
                          />
                          <span className="z-10">{label}</span>
                          <Badge
                            variant={active ? "active" : "default"}
                            className={`text-[9px] z-10 ${active ? "bg-background/20 text-background/70 border-transparent" : ""}`}
                          >
                            {count}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {filteredResources.length === 0 ? (
                  <Card
                    padding="lg"
                    className="flex flex-col items-center justify-center py-16 text-center border-dashed bg-surface/50"
                  >
                    <Search className="w-6 h-6 text-muted/50 mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      No Matching Files
                    </p>
                    <p className="text-xs text-muted max-w-sm mx-auto">
                      {searchQuery
                        ? `No files match "${searchQuery}" in this subject.`
                        : "No files match the selected filter."}
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-8">
                    {(contentResults.length > 0 || isSearchingContent) && (
                      <div className="space-y-4 bg-surface/40 border border-border rounded-xl p-5 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 border-b border-border pb-3">
                          <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-foreground">
                            {isSearchingContent ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Brain className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                              Content Matches
                            </h3>
                            <p className="text-[10px] font-medium text-muted">
                              AI Semantic Search
                              {contentResults.length > 0
                                ? ` · ${contentResults.length} snippets`
                                : ""}
                              {isSearchingContent ? " · searching…" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {contentResults.map((result, idx) => (
                            <Card
                              key={`${result.resource_id}-${idx}`}
                              hover
                              padding="sm"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                const resource = resources.find(
                                  (r) => r.id === result.resource_id,
                                );
                                if (resource) {
                                  const page = pageFromSectionLabel(
                                    result.section_label,
                                  );
                                  openResource(resource, page);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  const resource = resources.find(
                                    (r) => r.id === result.resource_id,
                                  );
                                  if (resource) {
                                    const page = pageFromSectionLabel(
                                      result.section_label,
                                    );
                                    openResource(resource, page);
                                  }
                                }
                              }}
                              className="group text-left cursor-pointer flex flex-col justify-between h-full shadow-xs"
                            >
                              <div>
                                <Badge className="text-[10px]">
                                  {result.subject_name}
                                </Badge>
                                <h4
                                  className="text-sm font-medium text-foreground mt-2 mb-2 line-clamp-1 group-hover:text-primary transition-colors"
                                  title={result.title}
                                >
                                  {cleanResourceTitle(result.title)}
                                </h4>
                                <div className="border-l-2 border-border-strong pl-3 text-xs text-muted leading-relaxed font-mono line-clamp-3">
                                  &ldquo;...{result.snippet}...&rdquo;
                                </div>
                              </div>
                              <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted group-hover:text-foreground transition-colors">
                                <span>Open document</span>
                                <span>→</span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {showNotes && (
                      <ResourceSection
                        title="Notes"
                        icon={<FileText className="w-3.5 h-3.5" />}
                        accentColor="var(--accent-notes)"
                        folders={notesFolders}
                        onOpenResource={openResource}
                        onSummarize={setSummarizingResource}
                        onShare={shareResource}
                        onFavorite={handleFavorite}
                        favoriteIds={favoriteIds}
                        activeFolderId={activeFolderId}
                        onFolderChange={handleFolderChange}
                        highlightFileId={viewerResource?.id}
                      />
                    )}

                    {showQb && qbItems.length > 0 && (
                      <ResourceSection
                        title="Question Banks"
                        icon={<BookOpenCheck className="w-3.5 h-3.5" />}
                        accentColor="var(--accent-qb)"
                        items={qbItems.filter(
                          (r) => r.category === "question-bank",
                        )}
                        onOpenResource={openResource}
                        onSummarize={setSummarizingResource}
                        onShare={shareResource}
                        onFavorite={handleFavorite}
                        favoriteIds={favoriteIds}
                      />
                    )}

                    {showQb &&
                      qbItems.some(
                        (r) => r.category === "solved-question-bank",
                      ) && (
                        <ResourceSection
                          title="Solved Question Banks"
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          accentColor="var(--accent-qb-solved)"
                          items={qbItems.filter(
                            (r) => r.category === "solved-question-bank",
                          )}
                          onOpenResource={openResource}
                          onSummarize={setSummarizingResource}
                          onShare={shareResource}
                          onFavorite={handleFavorite}
                          favoriteIds={favoriteIds}
                        />
                      )}

                    {showPpt && (
                      <ResourceSection
                        title="Presentations"
                        icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                        accentColor="var(--accent-ppt)"
                        folders={pptFolders}
                        onOpenResource={openResource}
                        onSummarize={setSummarizingResource}
                        onShare={shareResource}
                        onFavorite={handleFavorite}
                        favoriteIds={favoriteIds}
                        activeFolderId={activeFolderId}
                        onFolderChange={handleFolderChange}
                        highlightFileId={viewerResource?.id}
                      />
                    )}

                    {showPyq && (
                      <ResourceSection
                        title="Previous Year Questions"
                        icon={<FileText className="w-3.5 h-3.5" />}
                        accentColor="var(--accent-pyq)"
                        folders={pyqFolders}
                        onOpenResource={openResource}
                        onSummarize={setSummarizingResource}
                        onShare={shareResource}
                        onFavorite={handleFavorite}
                        favoriteIds={favoriteIds}
                        activeFolderId={activeFolderId}
                        onFolderChange={handleFolderChange}
                        highlightFileId={viewerResource?.id}
                      />
                    )}

                    {showAssignments && assignmentFolders.length > 0 && (
                      <ResourceSection
                        title="Assignments"
                        icon={<ClipboardList className="w-3.5 h-3.5" />}
                        accentColor="var(--accent-codes)"
                        folders={assignmentFolders}
                        onOpenResource={openResource}
                        onSummarize={setSummarizingResource}
                        onShare={shareResource}
                        onFavorite={handleFavorite}
                        favoriteIds={favoriteIds}
                        activeFolderId={activeFolderId}
                        onFolderChange={handleFolderChange}
                        highlightFileId={viewerResource?.id}
                      />
                    )}

                    {showOther && otherItems.length > 0 && (
                      <ResourceSection
                        title="Other Resources"
                        icon={<HardDrive className="w-3.5 h-3.5" />}
                        accentColor="var(--accent-other)"
                        items={otherItems}
                        onOpenResource={openResource}
                        onSummarize={setSummarizingResource}
                        onShare={shareResource}
                        onFavorite={handleFavorite}
                        favoriteIds={favoriteIds}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <Card
                padding="lg"
                className="flex flex-col items-center justify-center h-full text-center py-24 border-dashed bg-surface/30"
              >
                <Folder className="w-12 h-12 text-muted/30 mb-4" />
                <p className="text-base font-bold text-foreground mb-1">
                  Select a Subject
                </p>
                <p className="text-sm font-medium text-muted max-w-xs mx-auto">
                  Choose a subject from the sidebar to view its resources.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {viewerResource && (
        <ResourceViewer
          resource={viewerResource}
          onClose={closeViewer}
          assignmentSiblings={viewerSiblings}
          onOpenRelated={openResource}
          initialPage={viewerPage}
        />
      )}
      {summarizingResource && (
        <SummaryModal
          resourceId={summarizingResource.id}
          resourceTitle={cleanResourceTitle(summarizingResource.title)}
          onClose={() => setSummarizingResource(null)}
        />
      )}
    </div>
  );
}
