import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import Navigation from '@/components/Navigation';
import ConditionalFooter from '@/components/ConditionalFooter';
import { Providers } from '@/components/Providers';
import InstallPrompt from '@/components/pwa/InstallPrompt';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  style: ['normal', 'italic'],
});

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'Utility',
    template: '%s — Utility',
  },
  description: 'A premium academic workspace. Access your syllabus, resources, AI assistant, and planner in one place.',
  keywords: ['academic', 'syllabus', 'resources', 'planner', 'university', 'student', 'AI'],
  openGraph: {
    title: 'Utility',
    description: 'A premium academic workspace. Access your syllabus, resources, AI assistant, and planner in one place.',
    type: 'website',
    url: 'https://utility.vercel.app', // placeholder
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Utility',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} antialiased min-h-screen bg-background text-foreground overflow-x-hidden`}>
        <Providers>
          <div className="flex min-h-screen w-full">
            <Navigation />
            <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-clip">
              <main role="main" className="flex-1 w-full flex flex-col pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
                <Suspense
                  fallback={
                    <div
                      className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[60vh]"
                      role="status"
                      aria-live="polite"
                      aria-label="Loading"
                    >
                      <span className="loading-orb" aria-hidden />
                      <p className="text-xs font-medium text-muted tracking-wide">Loading…</p>
                    </div>
                  }
                >
                  {children}
                </Suspense>
              </main>
              <ConditionalFooter />
            </div>
          </div>
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}

