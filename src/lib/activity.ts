import { auth } from "@/lib/firebase";
import { localDateKey } from "@/lib/dateLocal";

const STORAGE_KEY = "utility_activity_logs";
const FLUSH_INTERVAL_MS = 60_000;

const pending = new Map<string, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleRegistered = false;

export { localDateKey };

function ensureLifecycleHooks() {
  if (typeof window === "undefined" || lifecycleRegistered) return;
  lifecycleRegistered = true;

  const flush = () => {
    void flushPending();
  };

  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPending();
  }, FLUSH_INTERVAL_MS);
}

async function flushPending() {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (pending.size === 0) return;

  const batch = new Map(pending);
  pending.clear();

  const user = auth.currentUser;
  if (!user) return;

  let idToken: string;
  try {
    idToken = await user.getIdToken();
  } catch (err) {
    console.error("API logActivity token error:", err);
    for (const [actionType, count] of batch) {
      pending.set(actionType, (pending.get(actionType) || 0) + count);
    }
    scheduleFlush();
    return;
  }

  await Promise.all(
    [...batch.entries()].map(async ([actionType, count]) => {
      try {
        const res = await fetch("/api/activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ actionType, count }),
        });
        if (!res.ok) {
          console.error("API logActivity failed:", res.status);
          pending.set(actionType, (pending.get(actionType) || 0) + count);
          scheduleFlush();
        }
      } catch (err) {
        console.error("API logActivity error:", err);
        pending.set(actionType, (pending.get(actionType) || 0) + count);
        scheduleFlush();
      }
    }),
  );
}

/** Log study activity locally + optionally to Firestore API. No React UI deps. */
export function logActivity(actionType: string, count = 1) {
  if (typeof window === "undefined") return;

  ensureLifecycleHooks();

  const today = localDateKey();

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const logs: Record<string, number> = existing ? JSON.parse(existing) : {};
    logs[today] = (logs[today] || 0) + count;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    window.dispatchEvent(new Event("activity_logged"));
  } catch (err) {
    console.error("Local activity log error:", err);
  }

  if (!auth.currentUser) return;

  pending.set(actionType, (pending.get(actionType) || 0) + count);
  scheduleFlush();
}

export { STORAGE_KEY as ACTIVITY_STORAGE_KEY };
