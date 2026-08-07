import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[70vh] px-6 py-16 page-fade-in">
      <p className="font-display text-7xl md:text-8xl text-foreground tracking-tight mb-4">
        404
      </p>
      <h1 className="text-lg font-medium text-foreground mb-2">
        Page not found
      </h1>
      <p className="text-sm text-foreground-subtle mb-8 max-w-sm text-center leading-relaxed">
        That route does not exist, or the resource moved.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
        >
          Home
        </Link>
        <Link
          href="/resources"
          className="px-5 py-2.5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface"
        >
          Resources
        </Link>
      </div>
    </div>
  );
}
