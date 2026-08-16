import Link from "next/link";
import {
  CalendarCheck,
  BookOpen,
  FileText,
  ArrowRight,
  Brain,
  ShieldCheck,
  Layers,
  Building2,
} from "lucide-react";
import AuthButtons from "./AuthButtons";
import HomeHeatmap from "./HomeHeatmap";
import HomeStats from "./HomeStats";

const FEATURES = [
  {
    href: "/planner",
    label: "Study Planner",
    number: "01",
    Icon: CalendarCheck,
    description:
      "Organize your month with natural-language prompts. Share & collaborate with peers.",
  },
  {
    href: "/ask",
    label: "Ask AI",
    number: "02",
    Icon: Brain,
    description:
      "Get instant explanations, flashcards, and study help powered by Llama 3.3.",
  },
  {
    href: "/syllabus",
    label: "Syllabus",
    number: "03",
    Icon: BookOpen,
    description:
      "Clear breakdown of every subject, unit by unit. Download full PDFs instantly.",
  },
  {
    href: "/resources",
    label: "Resources",
    number: "04",
    Icon: FileText,
    description:
      "Browse by subject → assignment folders (notebooks, datasets, writeups together). Notes are reference-only.",
  },
  {
    href: "/gpa",
    label: "GPA Calc",
    number: "05",
    Icon: ShieldCheck,
    description:
      "Calculate your SGPA and CGPA with auto-populated subjects from the database.",
  },
  {
    href: "/srs",
    label: "SRS Cards",
    number: "06",
    Icon: Layers,
    description:
      "Active Leitner spacing system. Review cards to lock them in long-term memory.",
  },
  {
    href: "/campus",
    label: "Campus",
    number: "07",
    Icon: Building2,
    description:
      "Faculty seating, staff directory, and lab registry — live from campus data.",
  },
];

export default function Home() {
  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden page-fade-in">
      {/* Hero grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(var(--foreground)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--foreground)/0.06)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none -z-20" />

      {/* Hero */}
      <section className="w-full max-w-7xl mx-auto px-6 pt-28 pb-28 flex flex-col items-center justify-center text-center relative min-h-[78vh]">
        <p className="font-display text-6xl sm:text-7xl md:text-8xl text-foreground tracking-tight mb-5">
          Utility
        </p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-snug mb-5 text-foreground max-w-2xl mx-auto">
          Everything for your semester.{" "}
          <span className="text-foreground-subtle font-medium">One place.</span>
        </h1>
        <p className="text-base md:text-lg text-foreground-subtle mb-10 max-w-xl mx-auto leading-relaxed">
          A structured workspace for syllabi, course materials, planning, and AI
          study help — built for MIT-WPU branches.
        </p>
        <div className="flex justify-center">
          <AuthButtons />
        </div>
      </section>

      <div className="w-full border-t border-border" />

      {/* How it connects */}
      <section className="w-full max-w-7xl mx-auto px-6 py-10">
        <p className="text-center text-sm text-foreground-subtle mb-4 font-medium">
          How everything links
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-foreground">
          <Link
            href="/syllabus"
            className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-border-strong transition-colors"
          >
            Syllabus
            <span className="text-muted font-medium"> · units</span>
          </Link>
          <ArrowRight className="w-3.5 h-3.5 text-muted" />
          <Link
            href="/resources"
            className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-border-strong transition-colors"
          >
            Vault
            <span className="text-muted font-medium"> · files</span>
          </Link>
          <ArrowRight className="w-3.5 h-3.5 text-muted" />
          <Link
            href="/ask"
            className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-border-strong transition-colors"
          >
            Ask AI
          </Link>
          <ArrowRight className="w-3.5 h-3.5 text-muted" />
          <Link
            href="/planner"
            className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-border-strong transition-colors"
          >
            Planner
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="w-full max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border shadow-sm">
          {FEATURES.map(({ href, label, number, Icon, description }) => (
            <Link
              key={href}
              href={href}
              className="group block bg-card hover:bg-surface card-premium-hover transition-all duration-300"
            >
              <div className="p-6 sm:p-7 h-full flex flex-col gap-6 relative">
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center group-hover:scale-105 group-hover:border-border-strong transition-all duration-300">
                    <Icon className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-xs font-mono text-foreground-subtle group-hover:text-foreground/70 transition-colors">
                    {number}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground mb-2">
                    {label}
                  </h2>
                  <p className="text-sm text-foreground-subtle leading-relaxed">
                    {description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground-subtle group-hover:text-foreground transition-colors">
                  <span className="animated-underline">Open {label}</span>
                  <ArrowRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Full-width heatmap */}
      <section className="w-full max-w-7xl mx-auto px-6 py-10">
        <HomeHeatmap />
      </section>

      <HomeStats />
    </div>
  );
}
