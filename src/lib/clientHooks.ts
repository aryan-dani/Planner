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

const localStorageListeners = new Map<string, Set<() => void>>();

function subscribeLocalStorageKey(key: string, onStoreChange: () => void) {
  let set = localStorageListeners.get(key);
  if (!set) {
    set = new Set();
    localStorageListeners.set(key, set);
  }
  set.add(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set!.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyLocalStorageKey(key: string) {
  localStorageListeners.get(key)?.forEach((cb) => cb());
}

/** Persist a boolean and notify same-tab `useLocalStorageBoolean` subscribers. */
export function writeLocalStorageBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore quota / private mode */
  }
  notifyLocalStorageKey(key);
}

/** SSR-safe localStorage boolean (server snapshot = defaultValue). */
export function useLocalStorageBoolean(
  key: string,
  defaultValue = false,
): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeLocalStorageKey(key, onStoreChange),
    () => readLocalStorageBoolean(key, defaultValue),
    () => defaultValue,
  );
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
