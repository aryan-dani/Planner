import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True after hydration; false during SSR. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** macOS vs other platforms for shortcut labels. */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    noop,
    () =>
      navigator.userAgent.includes("Mac") ||
      navigator.platform.includes("Mac"),
    () => false,
  );
}

export function readLocalStorageBoolean(
  key: string,
  defaultValue = false,
): boolean {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    return saved === "true";
  } catch {
    return defaultValue;
  }
}

function subscribeMatchMedia(query: string, callback: () => void): () => void {
  const mq = window.matchMedia(query);
  const handler = () => callback();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** Responsive boolean from a `matchMedia` query (SSR-safe default). */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeMatchMedia(query, onStoreChange),
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
