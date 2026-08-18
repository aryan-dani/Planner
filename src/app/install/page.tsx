'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';

export default function InstallPage() {
  return (
    <div className="flex-1 flex flex-col items-center max-w-xl mx-auto px-6 py-20 page-fade-in text-center">
      <p className="font-display text-4xl text-foreground tracking-tight mb-3">
        Utility
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-3">
        Install the app
      </h1>
      <p className="text-sm text-foreground-subtle mb-10 leading-relaxed max-w-md">
        Add Utility to your home screen or desktop for faster access and an
        app-like window.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px w-full mb-10 rounded-xl overflow-hidden border border-border bg-border shadow-sm text-left">
        <div className="bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Phone</h3>
          <p className="text-sm text-muted leading-relaxed">
            Chrome on Android shows an install banner. On iPhone, open the Share sheet and tap Add to Home Screen.
          </p>
        </div>
        <div className="bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Desktop</h3>
          <p className="text-sm text-muted leading-relaxed">
            In Chrome or Edge, use the install icon in the address bar, or Install App in the browser menu.
          </p>
        </div>
      </div>

      <div className="w-full border border-border bg-card rounded-xl px-6 py-5 text-sm text-muted leading-relaxed flex items-start gap-3 text-left">
        <Download className="w-4 h-4 shrink-0 mt-0.5 text-foreground" />
        <span>
          Already installed, or use the browser’s install control above. This page does not block Chrome’s native install banner.
        </span>
      </div>

      <Link
        href="/"
        className="mt-10 text-sm text-muted hover:text-foreground underline underline-offset-4 font-medium"
      >
        Back home
      </Link>
    </div>
  );
}
