import type { ResourceItem } from "@/lib/dataFetcher";

const STORAGE_KEY = "utility_favorite_resources";
const MAX_FAVORITES = 40;

export type FavoriteResource = {
  id: string;
  title: string;
  subject_name: string;
  category: string;
  file_url: string;
  academic_year?: string;
  branch?: string;
  semester?: number;
  favoritedAt: number;
};

function readAll(): FavoriteResource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: FavoriteResource[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_FAVORITES)),
    );
  } catch {
    // quota / private mode
  }
}

export function getFavoriteResources(): FavoriteResource[] {
  return readAll().sort((a, b) => b.favoritedAt - a.favoritedAt);
}

export function isFavoriteResource(id: string): boolean {
  return readAll().some((r) => r.id === id);
}

export function removeFavoriteResource(id: string): FavoriteResource[] {
  const next = readAll().filter((r) => r.id !== id);
  writeAll(next);
  return next.sort((a, b) => b.favoritedAt - a.favoritedAt);
}

export function toggleFavoriteResource(
  item: Pick<
    ResourceItem,
    "id" | "title" | "subject_name" | "category" | "file_url"
  >,
  scope?: { academicYear?: string; branch?: string; semester?: number },
): FavoriteResource[] {
  const existing = readAll();
  const idx = existing.findIndex((r) => r.id === item.id);
  if (idx >= 0) {
    const next = existing.filter((r) => r.id !== item.id);
    writeAll(next);
    return next.sort((a, b) => b.favoritedAt - a.favoritedAt);
  }

  const nextItem: FavoriteResource = {
    id: item.id,
    title: item.title,
    subject_name: item.subject_name,
    category: item.category,
    file_url: item.file_url,
    academic_year: scope?.academicYear,
    branch: scope?.branch,
    semester: scope?.semester,
    favoritedAt: Date.now(),
  };
  const list = [nextItem, ...existing.filter((r) => r.id !== item.id)].slice(
    0,
    MAX_FAVORITES,
  );
  writeAll(list);
  return list;
}

export { STORAGE_KEY as FAVORITE_RESOURCES_KEY };
