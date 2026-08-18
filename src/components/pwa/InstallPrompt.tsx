'use client';

/**
 * Custom in-app install intercept was removed. Calling preventDefault() on
 * beforeinstallprompt without prompt() made Chrome log a banner warning on
 * every route. Native install UI + /install cover installation.
 */
export default function InstallPrompt() {
  return null;
}
