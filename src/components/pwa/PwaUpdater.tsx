'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/** Clear SW/runtime caches on update; never touch utility-pdf-v2 (Drive PDF Cache API). */
async function clearWorkboxCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key !== 'utility-pdf-v2' && !key.startsWith('utility-pdf'))
      .map((key) => caches.delete(key)),
  );
}

function isOfflineShellWhileOnline() {
  if (!navigator.onLine) return false;
  const h1 = document.querySelector('h1')?.textContent?.trim();
  return h1 === "You're Offline";
}

function activateWorker(worker: ServiceWorker) {
  worker.postMessage({ type: 'SKIP_WAITING' });
}

export default function PwaUpdater() {
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

    const applyWaiting = (worker: ServiceWorker, { force }: { force: boolean }) => {
      if (force || isOfflineShellWhileOnline()) {
        activateWorker(worker);
        return;
      }
      toast.info('A new version of Utility is available.', {
        description: 'Click update to load the latest improvements.',
        action: {
          label: 'Update Now',
          onClick: () => {
            activateWorker(worker);
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

    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
        if (reg.waiting) {
          applyWaiting(reg.waiting, { force: isOfflineShellWhileOnline() });
        }
      } catch (err) {
        console.error('Failed to update service worker:', err);
      }
    };

    navigator.serviceWorker.ready.then(async (reg) => {
      if (reg.waiting) {
        applyWaiting(reg.waiting, { force: isOfflineShellWhileOnline() });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            applyWaiting(newWorker, { force: isOfflineShellWhileOnline() });
          }
        });
      });

      // Stuck clients: old App Shell SW serves /~offline while online → force recovery.
      if (isOfflineShellWhileOnline()) {
        await reg.update();
        if (reg.waiting) {
          activateWorker(reg.waiting);
        } else {
          try {
            await clearWorkboxCaches();
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
            window.location.reload();
          } catch (e) {
            console.error('Failed to recover from offline shell:', e);
          }
        }
      }
    });

    const intervalId = setInterval(checkForUpdates, 3600000);

    let refreshing = false;
    const handleControllerChange = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        await clearWorkboxCaches();
      } catch (e) {
        console.error('Failed to clear caches:', e);
      }
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
