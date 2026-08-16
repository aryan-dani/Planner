import Link from "next/link";
import {
  MapPin,
  BookUser,
  FlaskConical,
  ArrowRight,
  Building2,
} from "lucide-react";

const CAMPUS_LINKS = [
  {
    href: "/campus/seating",
    label: "Faculty Seating",
    description:
      "Find cabin and seating assignments for faculty across departments.",
    Icon: MapPin,
  },
  {
    href: "/campus/directory",
    label: "Faculty Directory",
    description:
      "Browse staff by program track — designation, contact, and specialization.",
    Icon: BookUser,
  },
  {
    href: "/campus/labs",
    label: "Labs",
    description:
      "Lab rooms with floor, systems, capacity, and assistant details.",
    Icon: FlaskConical,
  },
] as const;

export default function CampusHubPage() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 min-h-[80vh]">
      <div className="mb-10 border-b border-border pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-foreground shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            Campus
          </p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          MIT-WPU campus data
        </h1>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          Faculty seating, directory, and lab registry — live from the same
          campus backend. Updates there show up here without a Utility redeploy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CAMPUS_LINKS.map(({ href, label, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6 text-left transition-colors hover:bg-surface/60 hover:border-border-strong focus-visible:outline-offset-2"
          >
            <div className="w-10 h-10 rounded-xl border border-border bg-surface flex items-center justify-center text-foreground group-hover:border-foreground/30 transition-colors">
              <Icon className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h2 className="text-sm font-bold text-foreground">{label}</h2>
                <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-foreground transition-colors shrink-0" />
              </div>
              <p className="text-xs text-muted leading-relaxed">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
