"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import {
  startProviderLink,
  confirmMergeWithGithub,
  confirmMergeWithGoogle,
  consumeRedirectResult,
  getPendingMergeStep,
} from "@/lib/firebaseAuth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useAcademicStore, AcademicYear, Branch, Semester } from "@/store/academicStore";
import { DEFAULT_ACADEMIC_YEAR, DEFAULT_SEMESTER } from "@/lib/workspace";
import { isAcademicYear } from "@/lib/academic/scope";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User,
  GraduationCap,
  Link as LinkIcon,
  Save,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScopeSelector } from "@/components/academic/ScopeSelector";

// Helper to generate self-contained SVG base64 Data URLs for monochrome avatars
function generateAvatarDataUrl(emoji: string, gradientStart: string, gradientEnd: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="30" fill="url(#grad)" />
      <text x="50%" y="62%" font-size="52" text-anchor="middle" dominant-baseline="middle" filter="grayscale(100%) brightness(0.95) contrast(1.05)">${emoji}</text>
    </svg>
  `.trim();
  // Safe base64 encoding for client-side rendering
  if (typeof window !== "undefined") {
    return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
  }
  return "";
}

interface AvatarPreset {
  emoji: string;
  label: string;
  start: string;
  end: string;
}

// 12 Premium Greyscale / Monochrome Presets
const AVATAR_PRESETS: AvatarPreset[] = [
  { emoji: "🎓", label: "Scholar", start: "#1c1c1e", end: "#3a3a3c" },
  { emoji: "💻", label: "Developer", start: "#2c2c2e", end: "#48484a" },
  { emoji: "🧠", label: "Thinker", start: "#3a3a3c", end: "#636366" },
  { emoji: "🎒", label: "Learner", start: "#48484a", end: "#8e8e93" },
  { emoji: "⚡", label: "Spark", start: "#636366", end: "#aeaeb2" },
  { emoji: "🎯", label: "Focus", start: "#8e8e93", end: "#c7c7cc" },
  { emoji: "📚", label: "Books", start: "#aeaeb2", end: "#e5e5ea" },
  { emoji: "♟️", label: "Pawn", start: "#c7c7cc", end: "#f2f2f7" },
  { emoji: "👥", label: "Collab", start: "#111111", end: "#444444" },
  { emoji: "🛡️", label: "Guard", start: "#000000", end: "#333333" },
  { emoji: "⚙️", label: "Builder", start: "#212121", end: "#424242" },
  { emoji: "🐼", label: "Panda", start: "#1a1a1a", end: "#2a2a2a" },
];

export default function ProfileClientComponent() {
  const router = useRouter();
  const { academicYear, branch, semester, setAcademicYear, setBranch, setSemester } = useAcademicStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [mergeStep, setMergeStep] = useState<"github" | "google" | null>(null);
  const [redirectBusy, setRedirectBusy] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [tempPhotoUrl, setTempPhotoUrl] = useState(""); // Holds manual text inputs
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYear>(DEFAULT_ACADEMIC_YEAR);
  const [selectedBranch, setSelectedBranch] = useState<Branch>("AIDS");
  const [selectedSemester, setSelectedSemester] = useState<Semester>(DEFAULT_SEMESTER);

  const mergingRef = useRef(false);
  const workspaceRef = useRef({ academicYear, branch, semester });
  workspaceRef.current = { academicYear, branch, semester };

  // Authentication & Initial data loading
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        if (mergingRef.current) return;
        toast.error("Please sign in to access your profile settings.");
        router.push("/login?redirectTo=/profile");
        return;
      }
      setCurrentUser(user);
      setDisplayName(user.displayName || "");
      setPhotoURL(user.photoURL || "");
      setTempPhotoUrl(user.photoURL || "");

      // Fetch academic preferences from Firestore (or fallback to Zustand store)
      try {
        const userPrefsRef = doc(db, "users", user.uid);
        const snap = await getDoc(userPrefsRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.academic_year && isAcademicYear(data.academic_year)) {
            setSelectedAcademicYear(data.academic_year);
          } else {
            setSelectedAcademicYear(workspaceRef.current.academicYear);
          }
          if (data.branch) {
            setSelectedBranch(data.branch as Branch);
          } else {
            setSelectedBranch(workspaceRef.current.branch);
          }
          if (data.semester) {
            setSelectedSemester(data.semester as Semester);
          } else {
            setSelectedSemester(workspaceRef.current.semester);
          }
        } else {
          // If no doc, match the current store settings
          setSelectedAcademicYear(workspaceRef.current.academicYear);
          setSelectedBranch(workspaceRef.current.branch);
          setSelectedSemester(workspaceRef.current.semester);
        }
      } catch (err) {
        console.error("Error fetching academic preferences:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    mergingRef.current = true;
    (async () => {
      try {
        const outcome = await consumeRedirectResult(auth);
        if (cancelled) return;
        if (outcome.status === "linked") {
          setCurrentUser(outcome.user);
          setDisplayName(outcome.user.displayName || "");
          setPhotoURL(outcome.user.photoURL || "");
          setTempPhotoUrl(outcome.user.photoURL || "");
          setMergeStep(null);
          toast.success("Google and GitHub are now one account.");
        } else if (outcome.status === "needs-github-confirm") {
          setMergeStep("github");
        } else if (outcome.status === "needs-google-confirm") {
          setMergeStep("google");
        } else if (outcome.status === "error") {
          toast.error("Could not finish account linking. Please try again.");
        } else {
          setMergeStep(getPendingMergeStep());
        }
      } finally {
        mergingRef.current = false;
        if (!cancelled) setRedirectBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    try {
      // 1. Update Firebase Auth Profile (DisplayName and Avatar)
      await updateProfile(currentUser, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null,
      });

      // 2. Save User Profile and Preferences in Firestore
      const userPrefsRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userPrefsRef,
        {
          uid: currentUser.uid,
          email: currentUser.email || "",
          displayName: displayName.trim() || currentUser.email?.split("@")[0] || "Student",
          photoURL: photoURL.trim() || "",
          provider: providerLabel,
          academic_year: selectedAcademicYear,
          branch: selectedBranch,
          semester: Number(selectedSemester),
          updatedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        { merge: true }
      );

      // 3. Sync Client Store Preferences
      setAcademicYear(selectedAcademicYear);
      setBranch(selectedBranch);
      setSemester(selectedSemester);

      toast.success("Profile and preferences updated successfully!");
    } catch (err: any) {
      toast.error(`Failed to update profile: ${err.message || String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const selectPresetAvatar = (preset: AvatarPreset) => {
    const dataUrl = generateAvatarDataUrl(preset.emoji, preset.start, preset.end);
    setPhotoURL(dataUrl);
    setTempPhotoUrl(dataUrl);
  };

  const handleCustomPhotoUrlSubmit = () => {
    if (tempPhotoUrl.trim()) {
      setPhotoURL(tempPhotoUrl.trim());
      toast.success("Custom avatar image link applied!");
    } else {
      setPhotoURL("");
      setTempPhotoUrl("");
    }
  };

  const applyLinkedUser = (user: any) => {
    setCurrentUser(user);
    setDisplayName(user.displayName || "");
    setPhotoURL(user.photoURL || "");
    setTempPhotoUrl(user.photoURL || "");
  };

  const handleLinkGithub = async () => {
    if (!auth.currentUser) return;
    setLinking(true);
    mergingRef.current = true;
    try {
      const outcome = await startProviderLink(auth, "github");
      if (outcome.status === "linked") {
        applyLinkedUser(outcome.user);
        setMergeStep(null);
        toast.success("GitHub is now linked. You can sign in with either provider.");
      } else if (outcome.status === "needs-google-confirm") {
        setMergeStep("google");
        toast.message("Confirm Google to finish merging into one profile.");
      }
    } catch (err: any) {
      toast.error(
        err.code === "auth/popup-closed-by-user"
          ? "Linking was cancelled. Please try again."
          : err.message || "Could not link GitHub."
      );
    } finally {
      mergingRef.current = false;
      if (!auth.currentUser) {
        router.push("/login?redirectTo=/profile");
      }
      setLinking(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    setLinking(true);
    mergingRef.current = true;
    try {
      const outcome = await startProviderLink(auth, "google");
      if (outcome.status === "linked") {
        applyLinkedUser(outcome.user);
        setMergeStep(null);
        toast.success("Google is now linked. You can sign in with either provider.");
      } else if (outcome.status === "needs-github-confirm") {
        setMergeStep("github");
        toast.message("Confirm GitHub to finish merging into one profile.");
      }
    } catch (err: any) {
      toast.error(
        err.code === "auth/popup-closed-by-user"
          ? "Linking was cancelled. Please try again."
          : err.message || "Could not link Google."
      );
    } finally {
      mergingRef.current = false;
      if (!auth.currentUser) {
        router.push("/login?redirectTo=/profile");
      }
      setLinking(false);
    }
  };

  const handleConfirmGithubMerge = async () => {
    if (!auth.currentUser) return;
    setLinking(true);
    mergingRef.current = true;
    try {
      const outcome = await confirmMergeWithGithub(auth);
      if (outcome.status === "linked") {
        applyLinkedUser(outcome.user);
        setMergeStep(null);
        toast.success("Google and GitHub are now one account.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not finish merging GitHub.");
    } finally {
      mergingRef.current = false;
      if (!auth.currentUser) {
        router.push("/login?redirectTo=/profile");
      }
      setLinking(false);
    }
  };

  const handleConfirmGoogleMerge = async () => {
    if (!auth.currentUser) return;
    setLinking(true);
    mergingRef.current = true;
    try {
      const outcome = await confirmMergeWithGoogle(auth);
      if (outcome.status === "linked") {
        applyLinkedUser(outcome.user);
        setMergeStep(null);
        toast.success("Google and GitHub are now one account.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not finish merging Google.");
    } finally {
      mergingRef.current = false;
      if (!auth.currentUser) {
        router.push("/login?redirectTo=/profile");
      }
      setLinking(false);
    }
  };

  if (loading || redirectBusy) {
    return (
      <div
        className="flex flex-col min-h-screen items-center justify-center bg-background gap-3"
        role="status"
        aria-live="polite"
      >
        <span className="loading-orb" aria-hidden />
        <p className="text-xs font-semibold text-muted">Loading your preferences...</p>
      </div>
    );
  }

  // Determine provider type
  const isGoogle = currentUser?.providerData?.some(
    (p: any) => p.providerId === "google.com"
  );
  const isGithub = currentUser?.providerData?.some(
    (p: any) => p.providerId === "github.com"
  );
  const providerLabel = isGoogle
    ? "Google Account"
    : isGithub
      ? "GitHub Account"
      : "Email Account";

  return (
    <div className="min-h-screen bg-background relative px-4 md:px-8 py-6 md:py-12 overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-primary/3 blur-[90px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-foreground/3 blur-[90px]" />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Navigation Link */}
        <Link
          href="/planner"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </Link>

        {/* Title without Sparkles icon */}
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Profile Settings
          </h1>
          <p className="text-sm text-muted">
            Configure your academic settings, customize your avatar, and manage your account credentials.
          </p>
        </div>

        {/* Main Content Grid */}
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side: Avatar Card */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary/30 to-foreground/20" />

              <div className="w-24 h-24 rounded-2xl bg-foreground text-background flex items-center justify-center text-3xl font-black shadow-md border border-border/70 overflow-hidden mb-4 shrink-0">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  displayName?.[0] ?? currentUser.email?.[0] ?? "?"
                )}
              </div>

              <h2 className="text-sm font-bold text-foreground truncate max-w-full">
                {displayName || currentUser.email?.split("@")[0] || "Student"}
              </h2>
              <p className="text-[10px] text-muted font-mono mt-0.5 truncate max-w-full">
                {currentUser.email || "Private email"}
              </p>

              <span className="inline-flex items-center mt-3 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-hover/80 border border-border text-muted">
                {providerLabel}
              </span>
            </div>

            {/* Custom Image Link Input */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-muted" />
                Custom Image Link
              </h3>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={tempPhotoUrl}
                  onChange={(e) => setTempPhotoUrl(e.target.value)}
                  className="flex-1 min-w-0 w-full bg-surface/50 border border-border/70 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-foreground/45 text-foreground placeholder:text-muted truncate transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={handleCustomPhotoUrlSubmit}
                  className="bg-surface hover:bg-surface-hover border border-border text-foreground font-bold text-xs px-4 py-2.5 rounded-xl transition-colors duration-200 shrink-0"
                >
                  Apply
                </button>
              </div>
              <p className="text-[10px] text-muted-hover leading-relaxed">
                Paste any public image URL (JPEG, PNG, SVG) to set it as your profile avatar.
              </p>
            </div>
          </div>

          {/* Right Side: Settings Forms */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* General Information Card */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <User className="w-4 h-4 text-muted" />
                General Information
              </h3>

              {/* Display Name Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-foreground">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-background border border-border/95 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-foreground focus:border-foreground text-foreground placeholder:text-muted transition-all"
                />
              </div>

              {/* Preset Avatars Selection */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-foreground">
                  Choose Preset Avatar (Monochrome)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectPresetAvatar(preset)}
                      className="aspect-square rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-2xl relative shadow-xs group border border-border/50 hover:border-foreground/30 overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)`,
                      }}
                      title={preset.label}
                    >
                      <span className="filter grayscale brightness-90">{preset.emoji}</span>
                      {/* Selection dot */}
                      {photoURL.includes(preset.emoji) && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-foreground border border-background rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Academic Settings Card */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 pb-3 border-b border-border/50">
                <GraduationCap className="w-4 h-4 text-muted" />
                Curriculum & Branch Settings
              </h3>

              <ScopeSelector
                variant="settings"
                academicYear={selectedAcademicYear}
                branch={selectedBranch}
                semester={selectedSemester}
                onAcademicYearChange={setSelectedAcademicYear}
                onBranchChange={setSelectedBranch}
                onSemesterChange={setSelectedSemester}
              />
              <p className="text-[10px] text-muted-hover leading-relaxed">
                Saving these settings automatically syncs your layout, schedules, resources, and syllabus checklist.
              </p>
            </div>

            {/* Connected accounts */}
            {(!isGoogle || !isGithub || mergeStep) && (
              <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col gap-3">
                <h3 className="text-sm font-bold text-foreground pb-3 border-b border-border/50">
                  Connected accounts
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {mergeStep === "github"
                    ? "Google is on another Utility account. Confirm GitHub in this tab so both logins share one profile and photo."
                    : mergeStep === "google"
                      ? "GitHub is on another Utility account. Confirm Google in this tab so both logins share one profile and photo."
                      : "Link the other provider so Google and GitHub use the same profile and photo. If a popup is blocked, continue in this tab."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {mergeStep === "github" ? (
                    <button
                      type="button"
                      onClick={handleConfirmGithubMerge}
                      disabled={linking}
                      className="bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {linking ? "Linking…" : "Confirm GitHub"}
                    </button>
                  ) : mergeStep === "google" ? (
                    <button
                      type="button"
                      onClick={handleConfirmGoogleMerge}
                      disabled={linking}
                      className="bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {linking ? "Linking…" : "Confirm Google"}
                    </button>
                  ) : (
                    <>
                      {!isGithub && (
                        <button
                          type="button"
                          onClick={handleLinkGithub}
                          disabled={linking}
                          className="bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {linking ? "Linking…" : "Link GitHub"}
                        </button>
                      )}
                      {!isGoogle && (
                        <button
                          type="button"
                          onClick={handleLinkGoogle}
                          disabled={linking}
                          className="bg-foreground text-background text-xs font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          {linking ? "Linking…" : "Link Google"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Save Buttons */}
            <div className="flex items-center justify-between gap-4 mt-2">
              <button
                type="button"
                onClick={async () => {
                  await auth.signOut();
                  router.push("/");
                }}
                className="flex items-center gap-2 text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 hover:border-transparent px-4 py-3 rounded-xl transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-foreground text-background font-bold text-sm px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-95 duration-150 shadow-md ml-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
