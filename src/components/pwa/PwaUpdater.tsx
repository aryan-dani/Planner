'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/** Clear only Workbox SW caches; never touch utility-pdf-v2. */
async function clearWorkboxCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith('workbox-'))
      .map((key) => caches.delete(key)),
  );
}

export default function PwaUpdater() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'development') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      return;
    }

    // Check for updates periodically
    const checkForUpdates = async () => {
      if (navigator.serviceWorker.controller) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.update();
        } catch (err) {
          console.error('Failed to update service worker:', err);
        }
      }
    };

    // Check on mount
    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      // Check if there is already an update waiting
      if (reg.waiting) {
        triggerToast(reg.waiting);
      }

      // Listen for new service workers installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            triggerToast(newWorker);
          }
        });
      });
    });

    // Check for updates every hour
    const intervalId = setInterval(checkForUpdates, 3600000);

    // Listen for controllerchange (refresh page once active service worker updates)
    let refreshing = false;
    const handleControllerChange = async () => {
      if (!refreshing) {
        refreshing = true;
        
        // Cache busting: clear Workbox caches before reloading
        try {
          await clearWorkboxCaches();
        } catch (e) {
          console.error('Failed to clear caches:', e);
        }
        
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const triggerToast = (worker: ServiceWorker) => {
    toast.info('A new version of Utility is available.', {
      description: 'Click update to load the latest improvements.',
      action: {
        label: 'Update Now',
        onClick: () => {
          // Send skip waiting
          worker.postMessage({ type: 'SKIP_WAITING' });
          
          // Fallback reload in case controllerchange doesn't fire or takes too long
          setTimeout(async () => {
            try {
              await clearWorkboxCaches();
            } catch (e) {
              console.error('Failed to clear caches in fallback:', e);
            }
            window.location.reload();
          }, 2000);
        },
      },
      duration: 15000,
    });
  };

  return null;
}
