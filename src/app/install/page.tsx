'use client';

import { Download } from 'lucide-react';
import { usePWA } from '@/contexts/PWAContext';
import Link from 'next/link';

export default function InstallPage() {
  const { isInstallable, deferredPrompt, setDeferredPrompt } = usePWA();

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto px-6 py-20 page-fade-in">
      <p className="font-display text-4xl text-foreground tracking-tight mb-3">
        Utility
      </p>
      <h1 className="text-xl font-medium text-foreground mb-3">
        Install the app
      </h1>
      <p className="text-sm text-foreground-subtle mb-10 leading-relaxed max-w-md">
        Add Utility to your home screen or desktop for faster access and an
        app-like window. Works on supported browsers.
      </p>

      <ul className="space-y-4 mb-10 text-sm text-foreground-subtle border-y border-border py-6">
        <li>
          <span className="font-medium text-foreground">Mobile — </span>
          Use your browser&apos;s “Add to Home Screen” when prompted, or tap
          Install below.
        </li>
        <li>
          <span className="font-medium text-foreground">Desktop — </span>
          Install as a standalone window on Chromium-based browsers.
        </li>
      </ul>

      {isInstallable ? (
        <button
          onClick={handleInstall}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
      ) : (
        <p className="text-sm text-muted leading-relaxed">
          Already installed, or this browser does not expose an install prompt.
          You can still bookmark the site or use “Add to Home Screen” from the
          browser menu.
        </p>
      )}

      <Link
        href="/"
        className="mt-10 text-sm text-muted hover:text-foreground underline underline-offset-4"
      >
        Back home
      </Link>
    </div>
  );
}
