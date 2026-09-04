const STORAGE_KEY = "utility_reading_progress";

type ProgressMap = Record<string, number>;

function readAll(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as ProgressMap)
      : {};
  } catch {
    return {};
  }
}

function writeAll(map: ProgressMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

export function getReadingProgress(resourceId: string): number | null {
  if (!resourceId) return null;
  const page = readAll()[resourceId];
  return typeof page === "number" && page > 0 ? page : null;
}

export function setReadingProgress(resourceId: string, page: number): void {
  if (!resourceId || !(page > 0)) return;
  const map = readAll();
  map[resourceId] = Math.floor(page);
  writeAll(map);
}

export function clearReadingProgress(resourceId: string): void {
  const map = readAll();
  if (!(resourceId in map)) return;
  delete map[resourceId];
  writeAll(map);
}

export { STORAGE_KEY as READING_PROGRESS_KEY };
