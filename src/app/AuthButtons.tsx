"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAcademicStore } from "@/store/academicStore";
import {
  readStoredWorkspace,
  resolveWorkspace,
  workspaceQuery,
} from "@/lib/workspace";

export default function AuthButtons() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const storeBranch = useAcademicStore((s) => s.branch);
  const storeSemester = useAcademicStore((s) => s.semester);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  if (!mounted) return <div className="h-10 w-40" aria-hidden />;

  const { branch, semester } = resolveWorkspace(
    { branch: storeBranch, semester: String(storeSemester) },
    readStoredWorkspace(),
  );
  const qs = workspaceQuery(branch, semester);

  const primary =
    "inline-flex items-center justify-center min-h-11 gap-2 px-5 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90";
  const secondary =
    "inline-flex items-center justify-center min-h-11 gap-2 px-5 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-surface";

  return isLoggedIn ? (
    <div className="flex flex-wrap gap-3">
      <Link href={`/planner?${qs}`} className={primary}>
        Open Planner <ArrowRight className="w-4 h-4" />
      </Link>
      <Link href={`/resources?${qs}`} className={secondary}>
        Browse Resources
      </Link>
    </div>
  ) : (
    <Link href="/login" className={primary}>
      Get Started <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
