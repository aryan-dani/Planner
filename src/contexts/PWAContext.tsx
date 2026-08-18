'use client';

import { createContext, useContext } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextType {
  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  isInstallable: boolean;
}

const PWAContext = createContext<PWAContextType>({
  deferredPrompt: null,
  setDeferredPrompt: () => {},
  isInstallable: false,
});

export function PWAProvider({ children }: { children: React.ReactNode }) {
  // Intentionally do not listen for `beforeinstallprompt` or call preventDefault().
  // Cancelling that event without prompt() makes Chrome log
  // "Banner not shown: beforeinstallpromptevent.preventDefault() called"
  // on every navigation. Native install UI + /install remain available.
  return (
    <PWAContext.Provider
      value={{
        deferredPrompt: null,
        setDeferredPrompt: () => {},
        isInstallable: false,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export const usePWA = () => useContext(PWAContext);
