"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BookOpen,
  FileText,
  CalendarCheck,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Brain,
  Users,
  Layers,
  Download,
  Timer,
  GraduationCap,
  Heart,
  Building2,
  Waypoints,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useAcademicStore, AcademicYear, Branch, Semester } from "../store/academicStore";
import { startNavigationProgress } from "./NavigationProgress";
import {
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_BRANCH,
  DEFAULT_SEMESTER,
  parseAcademicYear,
  parseBranch,
  parseSemester,
  readStoredWorkspace,
  resolveWorkspace,
  writeStoredWorkspace,
} from "@/lib/workspace";
import { ScopeSelector } from "@/components/academic/ScopeSelector";
import { fetchAdminStatus } from "@/lib/adminStatus";

const NavUserMenu = dynamic(() => import("./NavUserMenu"), {
  ssr: false,
  loading: () => (
    <div className="h-10 w-full skeleton rounded-xl" aria-hidden />
  ),
});

export interface NavLinkItem {
  href: string;
  label: string;
  Icon: React.ComponentType<any>;
  featured?: boolean;
  desc: string;
}

const ACADEMIC_LINKS: NavLinkItem[] = [
  { href: "/resources", label: "Resources", Icon: FileText, featured: true, desc: "Subject files. Notes are reference-only" },
  { href: "/ask", label: "Ask AI", Icon: Brain, desc: "RAG-powered academic assistant" },
  { href: "/syllabus", label: "Syllabus", Icon: BookOpen, desc: "Course syllabus tracker" },
  { href: "/visualize", label: "Visualize", Icon: Waypoints, desc: "AI algorithm visualizers" },
];

const CAMPUS_LINKS: NavLinkItem[] = [
  { href: "/campus", label: "Campus", Icon: Building2, desc: "Seating, directory, and labs" },
];

const PRODUCTIVITY_LINKS: NavLinkItem[] = [
  { href: "/planner", label: "Study Planner", Icon: CalendarCheck, desc: "Collaborative schedule & logs" },
  { href: "/timer", label: "Focus Timer", Icon: Timer, desc: "Pomodoro study sessions" },
  { href: "/gpa", label: "GPA Calculator", Icon: GraduationCap, desc: "Track and project your grades" },
  { href: "/srs", label: "SRS Flashcards", Icon: Layers, desc: "Spaced repetition reviewer" },
];

const SOCIAL_LINKS: NavLinkItem[] = [
  { href: "/community", label: "Community", Icon: Users, desc: "Decks & WhatsApp" },
];

const SYSTEM_LINKS: NavLinkItem[] = [
  { href: "/install", label: "Install App", Icon: Download, desc: "PWA desktop application" },
  { href: "/support", label: "Support", Icon: Heart, desc: "Optional contribution" },
];

const SIDEBAR_EXPANDED = "md:w-72";
const SIDEBAR_COLLAPSED = "md:w-[4.25rem]";

function NavSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      {collapsed ? (
        <div className="mx-2.5 my-2 border-t border-border/50" />
      ) : (
        <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/55">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function SegmentedThemeToggle({ theme, setTheme }: { theme: string | undefined; setTheme: (theme: string) => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="skeleton h-8 rounded-xl border border-border/80 w-full" aria-hidden />;
  }

  const options = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div className="flex bg-background/70 border border-border/80 p-0.5 rounded-xl w-full">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all relative ${
              active
                ? "bg-background border border-border/80 text-foreground shadow-xs font-semibold"
                : "text-muted hover:text-foreground hover:bg-surface/30"
            }`}
            title={opt.label}
            aria-label={`Switch to ${opt.label} theme`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

function NavigationInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeAcademicYear = useAcademicStore((s) => s.academicYear);
  const storeBranch = useAcademicStore((s) => s.branch);
  const storeSemester = useAcademicStore((s) => s.semester);
  const urlWorkspace = resolveWorkspace(
    {
      year: searchParams.get("year"),
      branch: searchParams.get("branch"),
      semester: searchParams.get("semester"),
    },
    {
      academicYear: storeAcademicYear,
      branch: storeBranch,
      semester: storeSemester,
    },
  );
  const academicYear = urlWorkspace.academicYear;
  const branch = urlWorkspace.branch;
  const semester = urlWorkspace.semester;

  const {
    setAcademicYear,
    setBranch,
    setSemester,
    setWorkspace,
    setSearchQuery,
    setCommandPaletteOpen,
  } = useAcademicStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const { theme, setTheme } = useTheme();
  const prefsAppliedRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
    const stored = readStoredWorkspace();
    if (stored) {
      const resolved = resolveWorkspace(
        {
          year: searchParams.get("year"),
          branch: searchParams.get("branch"),
          semester: searchParams.get("semester"),
        },
        stored,
      );
      setWorkspace(resolved.academicYear, resolved.branch, resolved.semester);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from localStorage
  }, []);

  const handleCollapseToggle = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("sidebar-collapsed", String(nextState));
  };

  useEffect(() => {
    setIsMac(
      typeof navigator !== "undefined" &&
        (navigator.userAgent.includes("Mac") ||
          navigator.platform.includes("Mac")),
    );
  }, []);

  useEffect(() => {
    const urlYear = searchParams.get("year");
    const urlBranch = searchParams.get("branch");
    const urlSemester = searchParams.get("semester");
    if (!urlYear && !urlBranch && !urlSemester) return;
    const fromUrl = resolveWorkspace({
      year: urlYear,
      branch: urlBranch,
      semester: urlSemester,
    });
    setWorkspace(fromUrl.academicYear, fromUrl.branch, fromUrl.semester);
  }, [
    searchParams.get("year"),
    searchParams.get("branch"),
    searchParams.get("semester"),
    setWorkspace,
  ]);

  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const updateUrl = useCallback(
    (newYear: AcademicYear, newBranch: string, newSem: number) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      params.set("year", newYear);
      params.set("branch", newBranch);
      params.set("semester", newSem.toString());
      // Drop deep-link params that belong to the previous scope
      params.delete("subject");
      params.delete("filter");
      params.delete("view");
      params.delete("folder");
      writeStoredWorkspace(
        newYear,
        newBranch as Branch,
        newSem as Semester,
      );
      startNavigationProgress();
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router],
  );

  /** Apply Firestore/local prefs into store + URL when URL lacks workspace params. */
  const applyPrefsToUrl = useCallback(
    (prefYear: AcademicYear, prefBranch: Branch, prefSemester: Semester) => {
      if (prefsAppliedRef.current) return;
      const hasYear = !!searchParamsRef.current.get("year");
      const hasBranch = !!searchParamsRef.current.get("branch");
      const hasSemester = !!searchParamsRef.current.get("semester");
      if (hasYear && hasBranch && hasSemester) {
        prefsAppliedRef.current = true;
        return;
      }
      setWorkspace(prefYear, prefBranch, prefSemester);
      writeStoredWorkspace(prefYear, prefBranch, prefSemester);
      prefsAppliedRef.current = true;
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (!hasYear) params.set("year", prefYear);
      if (!hasBranch) params.set("branch", prefBranch);
      if (!hasSemester) params.set("semester", String(prefSemester));
      const nextQs = params.toString();
      const currentQs = searchParamsRef.current.toString();
      if (nextQs !== currentQs) {
        startTransition(() => {
          router.replace(`${pathname}?${nextQs}`);
        });
      }
    },
    [pathname, router, setWorkspace],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      if (!userEmail) {
        setIsAdmin(false);
        return;
      }
      try {
        const { auth } = await import("@/lib/firebase");
        const user = auth.currentUser;
        if (!user) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const { isAdmin: admin } = await fetchAdminStatus(
          () => user.getIdToken(),
          user.uid,
        );
        if (!cancelled) setIsAdmin(admin);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const cycleTheme = () => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  const isActive = useCallback((href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href),
    [pathname]
  );

  const showSelectors =
    pathname === "/resources" ||
    pathname.startsWith("/resources") ||
    pathname === "/syllabus" ||
    pathname === "/gpa" ||
    pathname === "/ask" ||
    pathname.startsWith("/ask") ||
    pathname === "/planner" ||
    pathname.startsWith("/planner");

  const renderNavLink = useCallback((link: NavLinkItem) => {
    const currentParams = searchParamsRef.current;
    const yParam =
      parseAcademicYear(currentParams.get("year")) ??
      storeAcademicYear ??
      DEFAULT_ACADEMIC_YEAR;
    const bParam =
      parseBranch(currentParams.get("branch")) ?? storeBranch ?? DEFAULT_BRANCH;
    const sParam =
      parseSemester(currentParams.get("semester")) ??
      storeSemester ??
      DEFAULT_SEMESTER;
    const finalHref = `${link.href}?year=${encodeURIComponent(yParam)}&branch=${bParam}&semester=${sParam}`;
    const active = isActive(link.href);
    return (
      <Link
        key={link.href}
        href={finalHref}
        onClick={() => setSearchQuery("")}
        aria-label={link.label}
        title={collapsed ? link.label : undefined}
        className={`flex items-center min-h-10 ${collapsed ? "justify-center px-0" : "justify-between px-2.5"} py-2 rounded-lg text-[13px] font-medium tracking-tight transition-colors border group relative overflow-visible ${
          active
            ? "bg-card border-border text-foreground shadow-xs"
            : "text-muted hover:text-foreground hover:bg-surface/60 active:bg-surface border-transparent"
        }`}
      >
        {active && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-foreground"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}

        <span className="flex items-center gap-2.5 min-w-0">
          <link.Icon className={`w-[17px] h-[17px] shrink-0 ${active ? "text-foreground" : "text-muted group-hover:text-foreground"}`} />
          {!collapsed && <span className="truncate">{link.label}</span>}
        </span>
        {!collapsed && link.featured && (
          <span className="flex items-center px-1.5 py-px rounded-md text-[9px] font-bold uppercase tracking-[0.12em] bg-foreground text-background shrink-0">
            Core
          </span>
        )}
      </Link>
    );
  }, [collapsed, isActive, setSearchQuery, storeAcademicYear, storeBranch, storeSemester]);

  const renderSidebarContent = (isMobile: boolean = false) => {
    const isCollapsed = collapsed && !isMobile;
    return (
      <div className="flex flex-col h-full select-none">
        {/* Brand / Logo */}
        <div className={`px-3 py-3.5 flex ${isCollapsed ? "flex-col items-center justify-center gap-3" : "items-center justify-between gap-2"} border-b border-border/50 min-h-[3.75rem]`}>
          <Link
            href="/"
            onClick={() => setSearchQuery("")}
            aria-label="Utility OS Home"
            className="text-base font-bold tracking-tight text-foreground flex items-center gap-2.5 group min-w-0"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-foreground text-background rounded-lg transition-transform group-hover:scale-[1.03] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <span className="font-display text-[1.15rem] leading-none tracking-tight text-foreground truncate">
                Utility
                <span className="ml-1 text-[0.7em] font-sans font-semibold text-muted tracking-wide">OS</span>
              </span>
            )}
          </Link>

          {isMobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className="tap-target rounded-lg text-muted hover:text-foreground hover:bg-surface/50 active:bg-surface border border-transparent transition-colors md:hidden"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleCollapseToggle}
              className="tap-target w-8 h-8 rounded-lg hover:bg-surface active:bg-surface-hover border border-transparent text-muted hover:text-foreground hover:border-border/70 transition-all shrink-0 inline-flex items-center justify-center"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {showSelectors && !isCollapsed && (
          <div className="px-3 pt-3 overflow-visible relative z-50">
            <div className="bg-card border border-border/80 p-3 rounded-2xl flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted/70">
                  Workspace
                </p>
                <span className="text-2xs font-semibold text-muted tabular-nums truncate">
                  {branch} · Sem {semester}
                </span>
              </div>
              <ScopeSelector
                academicYear={academicYear}
                branch={branch}
                semester={semester}
                variant="sidebar"
                onAcademicYearChange={(val) =>
                  updateUrl(val, branch, semester)
                }
                onBranchChange={(val) =>
                  updateUrl(academicYear, val, semester)
                }
                onSemesterChange={(val) =>
                  updateUrl(academicYear, branch, val)
                }
              />
            </div>
          </div>
        )}

        {/* Global Search Button */}
        <div className="px-3 pt-3">
          {isCollapsed ? (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search resources"
              className="w-full flex items-center justify-center min-h-10 p-2 bg-card border border-border/80 rounded-xl text-muted hover:text-foreground hover:border-border-strong active:bg-surface transition-all"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-muted" />
            </button>
          ) : (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search resources"
              className="w-full flex items-center justify-between min-h-10 px-3 py-2 bg-card border border-border/80 rounded-xl text-xs text-muted hover:text-foreground hover:border-border-strong active:bg-surface transition-all group"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors" />
                <span className="font-medium">Search…</span>
              </span>
              <kbd
                className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-semibold bg-background border border-border rounded-md text-muted"
                suppressHydrationWarning
              >
                {isMac ? "⌘K" : "Ctrl+K"}
              </kbd>
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5 custom-scrollbar">
          <NavSection title="Academic" collapsed={isCollapsed}>
            {ACADEMIC_LINKS.map(renderNavLink)}
          </NavSection>

          <NavSection title="Campus" collapsed={isCollapsed}>
            {CAMPUS_LINKS.map(renderNavLink)}
          </NavSection>

          <NavSection title="Productivity" collapsed={isCollapsed}>
            {PRODUCTIVITY_LINKS.map(renderNavLink)}
          </NavSection>

          <NavSection title="Connect" collapsed={isCollapsed}>
            {SOCIAL_LINKS.map(renderNavLink)}
          </NavSection>

          <NavSection title="System" collapsed={isCollapsed}>
            {SYSTEM_LINKS.map(renderNavLink)}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setSearchQuery("")}
                title={isCollapsed ? "Admin Dashboard" : undefined}
                aria-label="Admin Dashboard"
                className={`flex items-center min-h-10 ${isCollapsed ? "justify-center px-0" : "gap-2.5 px-2.5 py-2"} rounded-lg text-[13px] font-medium tracking-tight transition-colors border group ${
                  isActive("/admin")
                    ? "bg-primary/10 border-primary/20 text-primary shadow-xs"
                    : "text-muted hover:text-foreground hover:bg-surface/60 active:bg-surface border-transparent"
                }`}
              >
                <ShieldCheck className="w-[17px] h-[17px] text-muted group-hover:text-foreground" />
                {!isCollapsed && <span>Admin Dashboard</span>}
              </Link>
            )}
          </NavSection>
        </div>

        {/* Footer Controls */}
        <div className="p-3 border-t border-border/50 space-y-2.5 bg-card/40">
          {/* Theme segment toggle or single cycle button */}
          {isCollapsed ? (
            <button
              onClick={cycleTheme}
              className="w-full flex items-center justify-center min-h-11 p-2 bg-surface/60 border border-border/70 rounded-xl text-muted hover:text-foreground active:bg-surface transition-all"
              title={`Theme: ${theme}`}
              aria-label="Cycle color theme"
            >
              {theme === "light" ? (
                <Sun className="w-4 h-4" />
              ) : theme === "dark" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </button>
          ) : (
            <SegmentedThemeToggle theme={theme} setTheme={setTheme} />
          )}

          <NavUserMenu
            collapsed={isCollapsed}
            academicYear={academicYear}
            branch={branch}
            semester={semester}
            setAcademicYear={setAcademicYear}
            setBranch={setBranch}
            setSemester={setSemester}
            onWorkspaceFromPrefs={applyPrefsToUrl}
            onUserChange={(u) => setUserEmail(u?.email)}
          />

          {isCollapsed ? (
            <div className="flex justify-center pt-2 border-t border-border/20">
              <a
                href="https://www.aryandani.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-extrabold hover:text-foreground text-muted/70 transition-colors"
                title="Crafted by Aryan Dani"
              >
                AD
              </a>
            </div>
          ) : (
            <p className="text-[10px] text-muted/50 text-center tracking-tight font-semibold pt-1 border-t border-border/20">
              Crafted by{" "}
              <a
                href="https://www.aryandani.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold hover:underline hover:text-foreground text-muted/80 transition-colors"
              >
                Aryan Dani
              </a>
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Sticky Sidebar with collapse transition */}
      <aside
        aria-label="Primary"
        className={`h-screen sticky top-0 left-0 border-r border-border/80 bg-background-subtle z-40 hidden md:flex flex-col shrink-0 transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] w-0 overflow-hidden md:overflow-visible ${
          collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED
        }`}
        style={{ willChange: "width" }}
      >
        {renderSidebarContent(false)}
      </aside>
 
      {/* 2. Mobile Top Header */}
      <header className="fixed top-0 inset-x-0 w-full max-w-[100vw] h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-border bg-background z-50 flex items-center justify-between gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:hidden transition-colors">
        <Link
          href="/"
          onClick={() => setSearchQuery("")}
          className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2 min-h-11 min-w-0"
        >
          <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center text-background shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold truncate">Utility OS</span>
        </Link>
 
        <button
          className="tap-target shrink-0 rounded-lg text-muted hover:text-foreground hover:bg-surface/50 active:bg-surface border border-transparent transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>
 
      {/* 3. Mobile Navigation Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-[100] md:hidden"
            />
 
            {/* Sidebar drawer content */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
              className="fixed top-0 bottom-0 left-0 w-80 max-w-[88vw] bg-background-subtle border-r border-border/80 shadow-popover z-[101] md:hidden flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
 
export default function Navigation() {
  return (
    <Suspense
      fallback={
        <div className="w-72 h-screen sticky top-0 left-0 border-r border-border/80 bg-background-subtle z-40 hidden md:block" />
      }
    >
      <NavigationInner />
    </Suspense>
  );
}
