'use client';

import { ThemeProvider, useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { PWAProvider } from '@/contexts/PWAContext';
import { Toaster } from 'sonner';
import NavigationProgress from './NavigationProgress';

const CommandPalette = dynamic(() => import('./CommandPalette'), { ssr: false });


function ToasterProvider() {
  const { theme } = useTheme();
  
  return (
    <Toaster
      theme={theme as 'light' | 'dark' | 'system'}
      position="bottom-right"
      toastOptions={{
        className: 'font-sans',
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
        <ToasterProvider />
      </PWAProvider>
    </ThemeProvider>
  );
}
