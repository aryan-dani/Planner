'use client';

import { ThemeProvider, useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { PWAProvider } from '@/contexts/PWAContext';
import { Toaster } from 'sonner';
import NavigationProgress from './NavigationProgress';
import { useMediaQuery } from '@/lib/clientHooks';

const CommandPalette = dynamic(() => import('./CommandPalette'), { ssr: false });
const PwaUpdater = dynamic(() => import('./pwa/PwaUpdater'), { ssr: false });


function ToasterProvider() {
  const { theme } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 768px)', false);

  return (
    <Toaster
      theme={theme as 'light' | 'dark' | 'system'}
      position={isDesktop ? 'bottom-right' : 'bottom-center'}
      closeButton={false}
      visibleToasts={4}
      duration={4000}
      offset="max(1rem, env(safe-area-inset-bottom))"
      gap={10}
      toastOptions={{
        className: 'font-sans !bg-transparent !border-0 !shadow-none !p-0',
        unstyled: true,
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="utility-theme"
    >
      <PWAProvider>
        <NavigationProgress />
        {children}
        <CommandPalette />
        <PwaUpdater />
        <ToasterProvider />
      </PWAProvider>
    </ThemeProvider>
  );
}
