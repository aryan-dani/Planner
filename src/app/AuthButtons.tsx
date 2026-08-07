"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function AuthButtons() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  if (!mounted) return <div className="h-10 w-40" aria-hidden />;

  const primary =
    "inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90";
  const secondary =
    "inline-flex items-center gap-2 px-5 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-surface";

  return isLoggedIn ? (
    <div className="flex flex-wrap gap-3">
      <Link href="/planner" className={primary}>
        Open Planner <ArrowRight className="w-4 h-4" />
      </Link>
      <Link href="/resources" className={secondary}>
        Browse Resources
      </Link>
    </div>
  ) : (
    <Link href="/login" className={primary}>
      Get Started <ArrowRight className="w-4 h-4" />
    </Link>
  );
}
