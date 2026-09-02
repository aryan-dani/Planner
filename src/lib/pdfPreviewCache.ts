const CACHE_NAME = "utility-pdf-v1";

export function getPreviewUrl(driveId: string, ext = "pdf"): string {
  return `/api/resources/preview?id=${encodeURIComponent(driveId)}&ext=${encodeURIComponent(ext)}`;
}

/** Fetch PDF bytes with Cache Storage for fast repeat views. */
export async function fetchCachedPdf(driveId: string, ext = "pdf"): Promise<Blob> {
  const url = getPreviewUrl(driveId, ext);

  if (typeof caches !== "undefined") {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return hit.blob();

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 413) throw new Error("too large");
      throw new Error("preview failed");
    }
    await cache.put(url, res.clone());
    return res.blob();
  }

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 413) throw new Error("too large");
    throw new Error("preview failed");
  }
  return res.blob();
}

/** Warm Cache Storage on hover so the first open feels instant. */
export function prefetchPdf(driveId: string, ext = "pdf"): void {
  if (!driveId) return;
  void fetchCachedPdf(driveId, ext).catch(() => {});
}
