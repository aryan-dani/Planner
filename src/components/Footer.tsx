'use client';

import Link from 'next/link';
import { useAcademicStore } from '@/store/academicStore';

export default function Footer() {
  const academicYear = useAcademicStore((s) => s.academicYear);
  const branch = useAcademicStore((s) => s.branch);
  const semester = useAcademicStore((s) => s.semester);

  // Use the Zustand store (same on SSR + first client paint). Never read
  // useSearchParams here — static pages omit the query string on the server,
  // which mismatched hrefs and contributed to hydration errors.
  const getLinkWithParams = (href: string) => {
    if (href.startsWith('http') || href.startsWith('//')) return href;
    const params = new URLSearchParams();
    params.set('year', academicYear);
    params.set('branch', branch);
    params.set('semester', String(semester));
    return `${href}?${params.toString()}`;
  };

  return (
    <footer className="w-full border-t border-border/40 bg-background-subtle mt-auto relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-50 pointer-events-none" />
      <div className="max-w-7xl mx-auto page-gutter py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
          <div className="max-w-xs">
            <Link href={getLinkWithParams('/')} className="font-display text-xl tracking-tight text-foreground flex items-center gap-2 mb-3">
              Utility
            </Link>
            <p className="text-sm text-muted leading-relaxed">
              Academic workspace for syllabus, resources, and planning.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Workspace</h4>
              <nav className="flex flex-col gap-2.5">
                <Link href={getLinkWithParams('/syllabus')} className="text-sm text-muted hover:text-foreground transition-colors">Syllabus</Link>
                <Link href={getLinkWithParams('/resources')} className="text-sm text-muted hover:text-foreground transition-colors">Resources</Link>
                <Link href={getLinkWithParams('/ask')} className="text-sm text-muted hover:text-foreground transition-colors">Ask AI</Link>
                <Link href="/campus" className="text-sm text-muted hover:text-foreground transition-colors">Campus</Link>
              </nav>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Tools</h4>
              <nav className="flex flex-col gap-2.5">
                <Link href={getLinkWithParams('/gpa')} className="text-sm text-muted hover:text-foreground transition-colors">GPA Calculator</Link>
                <Link href={getLinkWithParams('/planner')} className="text-sm text-muted hover:text-foreground transition-colors">Weekly Planner</Link>
                <Link href={getLinkWithParams('/timer')} className="text-sm text-muted hover:text-foreground transition-colors">Focus Timer</Link>
              </nav>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">Company</h4>
              <nav className="flex flex-col gap-2.5">
                <Link href={getLinkWithParams('/support')} className="text-sm text-muted hover:text-foreground transition-colors">Support</Link>
                <Link href={getLinkWithParams('/community')} className="text-sm text-muted hover:text-foreground transition-colors">Community</Link>
                <a
                  href="https://chat.whatsapp.com/IptJTcvj4F848iY2riZ3YZ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  WhatsApp
                </a>
                <a href="https://www.aryandani.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-foreground transition-colors">Portfolio</a>
              </nav>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted/60" suppressHydrationWarning>
            © 2026 Utility. Built for efficiency.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://www.aryandani.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted/60 hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <span>Crafted by</span>
              <span className="font-semibold text-foreground">Aryan Dani</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
