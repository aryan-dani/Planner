"use client";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_PREFIX = "utility-admin-status:";

type AdminStatus = { isAdmin: boolean; email: string | null };

type CachedAdminStatus = AdminStatus & { fetchedAt: number };

function cacheKey(uid: string): string {
  return `${CACHE_PREFIX}${uid}`;
}

function readCache(uid: string): AdminStatus | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAdminStatus;
    if (
      typeof parsed?.fetchedAt !== "number" ||
      Date.now() - parsed.fetchedAt > CACHE_TTL_MS
    ) {
      sessionStorage.removeItem(cacheKey(uid));
      return null;
    }
    return { isAdmin: !!parsed.isAdmin, email: parsed.email ?? null };
  } catch {
    return null;
  }
}

function writeCache(uid: string, status: AdminStatus): void {
  try {
    const payload: CachedAdminStatus = { ...status, fetchedAt: Date.now() };
    sessionStorage.setItem(cacheKey(uid), JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable; ignore
  }
}

/**
 * Calls /api/admin/me once per session (1h TTL), keyed by uid.
 */
export async function fetchAdminStatus(
  getIdToken: () => Promise<string>,
  uid: string,
): Promise<AdminStatus> {
  const cached = readCache(uid);
  if (cached) return cached;

  const token = await getIdToken();
  const res = await fetch("/api/admin/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const status: AdminStatus = { isAdmin: false, email: null };
    writeCache(uid, status);
    return status;
  }
  const data = (await res.json()) as { isAdmin?: boolean; email?: string | null };
  const status: AdminStatus = {
    isAdmin: !!data.isAdmin,
    email: data.email ?? null,
  };
  writeCache(uid, status);
  return status;
}
