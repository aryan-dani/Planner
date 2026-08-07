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
            <div className="flex-1 flex flex-col min-w-0 w-full">
              <main role="main" className="flex-1 w-full flex flex-col pt-14 md:pt-0">
                <Suspense
                  fallback={
                    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                      <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
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

