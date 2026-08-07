import { auth } from "@/lib/firebase";

const STORAGE_KEY = "utility_activity_logs";

/** Log study activity locally + optionally to Firestore API. No React UI deps. */
export function logActivity(actionType: string, count = 1) {
  if (typeof window === "undefined") return;

  const today = new Date().toISOString().split("T")[0];

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const logs: Record<string, number> = existing ? JSON.parse(existing) : {};
    logs[today] = (logs[today] || 0) + count;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    window.dispatchEvent(new Event("activity_logged"));
  } catch (err) {
    console.error("Local activity log error:", err);
  }

  const user = auth.currentUser;
  if (!user) return;

  user
    .getIdToken()
    .then((idToken) => {
      fetch("/api/activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ actionType, count }),
      }).catch((err) => console.error("API logActivity network error:", err));
    })
    .catch((err) => console.error("API logActivity token error:", err));
}

export { STORAGE_KEY as ACTIVITY_STORAGE_KEY };
