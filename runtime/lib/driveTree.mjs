/**
 * Shared Google Drive tree helpers: list, walk, resolve/create folder paths.
 */
import { getDrive, getWritableDrive, DRIVE_SHARED_OPTS } from "./drive.mjs";
import { getEnv } from "./env.mjs";

export { DRIVE_SHARED_OPTS };

export const FOLDER_MIME = "application/vnd.google-apps.folder";

export function getRootFolderId() {
  const id = getEnv("GOOGLE_DRIVE_FOLDER_ID");
  if (!id) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in environment.");
  return id;
}

function escapeQuery(name) {
  return String(name).replace(/'/g, "\\'");
}

/**
 * List direct children of a folder.
 * @param {string} folderId
 * @param {{ drive?: import('googleapis').drive_v3.Drive, fields?: string }} [opts]
 */
export async function listChildren(
  folderId,
  { drive = getDrive(), fields = "id, name, mimeType, modifiedTime" } = {},
) {
  const out = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken, files(${fields})`,
      pageSize: 100,
      pageToken,
      orderBy: "folder,name",
      ...DRIVE_SHARED_OPTS,
    });
    out.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken ?? null;
  } while (pageToken);
  return out;
}

/**
 * Recursively walk files (not folders) under folderId.
 * @returns {Promise<Array<{ id: string, name: string, path: string, updatedAt?: string }>>}
 */
export async function walkFiles(
  folderId,
  pathPrefix = "",
  { drive = getDrive() } = {},
) {
  const filesList = [];
  const children = await listChildren(folderId, {
    drive,
    fields: "id, name, mimeType, modifiedTime",
  });

  for (const file of children) {
    const relativePath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
    if (file.mimeType === FOLDER_MIME) {
      const sub = await walkFiles(file.id, relativePath, { drive });
      filesList.push(...sub);
    } else {
      filesList.push({
        id: file.id,
        name: file.name,
        path: relativePath,
        updatedAt: file.modifiedTime,
      });
    }
  }
  return filesList;
}

/**
 * Find a child folder by exact name under parentId.
 * @returns {Promise<string|null>}
 */
export async function findChildFolder(
  name,
  parentId,
  { drive = getDrive() } = {},
) {
  const clean = escapeQuery(name);
  const res = await drive.files.list({
    q: `name = '${clean}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
    ...DRIVE_SHARED_OPTS,
  });
  return res.data.files?.[0]?.id ?? null;
}

/**
 * Find a non-folder child by exact name under parentId.
 * @returns {Promise<{ id: string, name: string, modifiedTime?: string }|null>}
 */
export async function findChildFile(
  name,
  parentId,
  { drive = getDrive() } = {},
) {
  const clean = escapeQuery(name);
  const res = await drive.files.list({
    q: `name = '${clean}' and '${parentId}' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id, name, modifiedTime)",
    pageSize: 1,
    ...DRIVE_SHARED_OPTS,
  });
  return res.data.files?.[0] ?? null;
}

/**
 * Get or create a folder named `name` under parentId.
 * @returns {Promise<{ id: string, created: boolean }>}
 */
export async function getOrCreateFolder(
  name,
  parentId,
  { drive = getWritableDrive(), dryRun = false } = {},
) {
  const existing = await findChildFolder(name, parentId, { drive });
  if (existing) return { id: existing, created: false };

  if (dryRun) {
    console.log(`  [dry-run] would create folder: ${name}`);
    return { id: parentId, created: true };
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  console.log(`  Created remote folder: ${name}`);
  return { id: folder.data.id, created: true };
}

/**
 * Resolve (and optionally create) a folder path under the Drive root.
 * Segments are joined with `/` relative to GOOGLE_DRIVE_FOLDER_ID.
 *
 * @param {string|string[]} pathOrSegments e.g. "2026-2027/AIDS/Sem_5_AIDS/Sem_5_Notes/GML"
 * @param {{ create?: boolean, dryRun?: boolean, drive?: object }} [opts]
 * @returns {Promise<{ folderId: string, path: string, created: number }>}
 */
export async function resolveFolderPath(
  pathOrSegments,
  { create = false, dryRun = false, drive = getWritableDrive() } = {},
) {
  const segments = Array.isArray(pathOrSegments)
    ? pathOrSegments.filter(Boolean)
    : String(pathOrSegments)
        .replace(/\\/g, "/")
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);

  let currentId = getRootFolderId();
  let created = 0;
  const resolved = [];

  for (const segment of segments) {
    if (create) {
      const result = await getOrCreateFolder(segment, currentId, {
        drive,
        dryRun,
      });
      if (result.created) created += 1;
      currentId = result.id;
    } else {
      const found = await findChildFolder(segment, currentId, { drive });
      if (!found) {
        throw new Error(
          `Folder not found: ${[...resolved, segment].join("/")}`,
        );
      }
      currentId = found;
    }
    resolved.push(segment);
  }

  return { folderId: currentId, path: resolved.join("/"), created };
}

/**
 * List a folder tree for CLI display.
 */
export async function listTree(
  folderId,
  {
    depth = 4,
    prefix = "",
    currentDepth = 0,
    drive = getDrive(),
  } = {},
) {
  if (currentDepth > depth) return;
  const children = await listChildren(folderId, {
    drive,
    fields: "id, name, mimeType",
  });
  for (const file of children) {
    const isFolder = file.mimeType === FOLDER_MIME;
    console.log(
      `${prefix}${isFolder ? "📁" : "📄"} ${file.name}  (${file.id})`,
    );
    if (isFolder) {
      await listTree(file.id, {
        depth,
        prefix: prefix + "  ",
        currentDepth: currentDepth + 1,
        drive,
      });
    }
  }
}

/**
 * Search files by name under the root (Drive API name contains).
 */
export async function findFilesByName(
  query,
  { drive = getDrive(), limit = 50 } = {},
) {
  const clean = escapeQuery(query);
  const rootId = getRootFolderId();
  const res = await drive.files.list({
    q: `name contains '${clean}' and trashed = false and '${rootId}' in parents`,
    fields: "files(id, name, mimeType, parents, modifiedTime)",
    pageSize: limit,
    ...DRIVE_SHARED_OPTS,
  });
  // Also search globally within shared drive / all drives — name contains may miss nested.
  // Fall back to broader query without parent constraint (still under shared drives).
  const nested = await drive.files.list({
    q: `name contains '${clean}' and trashed = false`,
    fields: "files(id, name, mimeType, parents, modifiedTime)",
    pageSize: limit,
    ...DRIVE_SHARED_OPTS,
  });
  const byId = new Map();
  for (const f of [...(res.data.files || []), ...(nested.data.files || [])]) {
    byId.set(f.id, f);
  }
  return [...byId.values()].slice(0, limit);
}
