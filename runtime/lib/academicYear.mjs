/** Shared academic-year constants for runtime Drive tools. */

export const ACADEMIC_YEARS = ["2026-2027", "2025-2026"];
export const DEFAULT_ACADEMIC_YEAR = "2026-2027";
export const LEGACY_ACADEMIC_YEAR = "2025-2026";
export const ACADEMIC_YEAR_PATH_RE = /^\d{4}-\d{4}$/;

/**
 * Parse academic year from a Drive path segment list.
 * If the first segment is YYYY-YYYY, use it; otherwise legacy archive year.
 */
export function parseAcademicYearFromPath(parts) {
  if (parts.length > 0 && ACADEMIC_YEAR_PATH_RE.test(parts[0])) {
    return parts[0];
  }
  return LEGACY_ACADEMIC_YEAR;
}

/** Index offset when path starts with a year folder (0 or 1). */
export function yearPathOffset(parts) {
  return parts.length > 0 && ACADEMIC_YEAR_PATH_RE.test(parts[0]) ? 1 : 0;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function isReservedRootFolder(name) {
  return name === "_Junk" || name === "_JUNK";
}

/**
 * List year-scoped containers under the Drive root.
 * When year folders exist, each scope is one YYYY-YYYY folder.
 * Otherwise a single scope with containerId = root (legacy layout).
 */
export async function listDriveScopes(listChildren, rootId) {
  const top = (await listChildren(rootId)).filter(
    (f) => f.mimeType === FOLDER_MIME && !isReservedRootFolder(f.name),
  );
  const yearFolders = top.filter((f) => ACADEMIC_YEAR_PATH_RE.test(f.name));

  if (yearFolders.length > 0) {
    return yearFolders.map((yf) => ({
      academicYear: yf.name,
      containerId: yf.id,
      pathPrefix: yf.name,
    }));
  }

  return [
    {
      academicYear: null,
      containerId: rootId,
      pathPrefix: "",
    },
  ];
}
