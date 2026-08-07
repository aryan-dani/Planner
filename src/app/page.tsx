import Link from "next/link";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import AuthButtons from "./AuthButtons";

const ActivityHeatmap = dynamic(() => import("@/components/ActivityHeatmap"), {
  ssr: false,
  loading: () => <div className="w-full h-40 skeleton rounded-lg" />,
});

const FEATURES = [
  {
    href: "/planner",
    label: "Study Planner",
    description: "Month view with natural-language planning and shared calendars.",
  },
  {
    href: "/ask",
    label: "Ask AI",
    description: "Explanations, flashcards, and study help in one thread.",
  },
  {
    href: "/syllabus",
    label: "Syllabus",
    description: "Unit-by-unit breakdowns with downloadable PDFs.",
  },
  {
    href: "/resources",
    label: "Resources",
    description: "Notes, PPTs, question banks, and PYQs by subject. Notes are reference-only — not exam guarantees.",
  },
  {
    href: "/gpa",
    label: "GPA Calc",
    description: "SGPA and CGPA with subjects from the catalog.",
  },
  {
    href: "/srs",
    label: "SRS Cards",
    description: "Leitner spacing to lock material into long-term memory.",
  },
];

export default function Home() {
  return (
    <div className="flex-1 w-full flex flex-col page-fade-in">
      <section className="w-full max-w-3xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 min-h-[70vh] flex flex-col justify-center">
        <p className="font-display text-6xl sm:text-7xl md:text-8xl text-foreground tracking-tight mb-6">
          Utility
        </p>
        <h1 className="text-xl sm:text-2xl font-medium text-foreground mb-4 max-w-lg leading-snug">
          Your semester, in one workspace.
        </h1>
        <p className="text-base text-foreground-subtle mb-10 max-w-md leading-relaxed">
          Syllabi, course materials, planning, and AI study help — structured
          for MIT-WPU branches.
        </p>
        <AuthButtons />
      </section>

      <section className="w-full border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-sm font-semibold text-muted mb-8 tracking-wide uppercase">
            Tools
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {FEATURES.map(({ href, label, description }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-baseline justify-between gap-6 py-5 hover:bg-surface/40 -mx-2 px-2 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-base font-medium text-foreground group-hover:underline underline-offset-4">
                      {label}
                    </span>
                    <p className="text-sm text-foreground-subtle mt-1 leading-relaxed">
                      {description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="w-full max-w-3xl mx-auto px-6 py-12 border-t border-border">
        <ActivityHeatmap />
      </section>
    </div>
  );
}
