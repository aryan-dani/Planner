"use client";

import Link from "next/link";

export default function AskError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 w-full max-w-lg mx-auto page-gutter py-16 text-center">
      <h1 className="text-xl font-bold text-foreground mb-2">Ask AI failed to load</h1>
      <p className="text-sm text-muted mb-6">{error.message || "Something went wrong."}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-semibold"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-muted hover:text-foreground underline">
          Home
        </Link>
      </div>
    </div>
  );
}
