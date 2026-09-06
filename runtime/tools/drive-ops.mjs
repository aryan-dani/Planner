/**
 * Drive CLI helpers: ls, find, rm, mv
 */
import { getDrive, getWritableDrive } from "../lib/drive.mjs";
import {
  getRootFolderId,
  resolveFolderPath,
  listTree,
  findFilesByName,
  FOLDER_MIME,
} from "../lib/driveTree.mjs";
import {
  resourceIdFromPath,
  deleteResourceById,
  upsertResources,
} from "../lib/driveCatalog.mjs";

export async function driveLs(argv = []) {
  const depthArg = argv.find((a) => a.startsWith("--depth="));
  const depth = depthArg ? Number(depthArg.slice(8)) : 4;
  const pathArg = argv.find((a) => !a.startsWith("-")) || "";
  const rootId = getRootFolderId();

  let folderId = rootId;
  let label = "(root)";
  if (pathArg) {
    const resolved = await resolveFolderPath(pathArg, {
      create: false,
      drive: getDrive(),
    });
    folderId = resolved.folderId;
    label = resolved.path;
  }

  console.log(`\n📂 ${label}\n`);
  await listTree(folderId, { depth, drive: getDrive() });
  console.log("");
}

export async function driveFind(argv = []) {
  const query = argv.find((a) => !a.startsWith("-"));
  if (!query) throw new Error("Usage: drive find <name-fragment>");
  const files = await findFilesByName(query);
  console.log(`\n🔎 Found ${files.length} match(es) for "${query}":\n`);
  for (const f of files) {
    const kind = f.mimeType === FOLDER_MIME ? "📁" : "📄";
    console.log(`  ${kind} ${f.name}  (${f.id})`);
  }
  console.log("");
}

export async function driveRm(argv = []) {
  const apply = argv.includes("--apply");
  const dryRun = !apply || argv.includes("--dry-run");
  const target = argv.find((a) => !a.startsWith("-"));
  if (!target) {
    throw new Error("Usage: drive rm <drive-path|fileId> --dry-run|--apply");
  }

  const drive = getWritableDrive();
  let fileId = target;
  let drivePath = null;

  if (target.includes("/")) {
    drivePath = target.replace(/\\/g, "/");
    const parts = drivePath.split("/");
    const fileName = parts.pop();
    const folderPath = parts.join("/");
    const { folderId } = await resolveFolderPath(folderPath, {
      create: false,
      drive: getDrive(),
    });
    const { findChildFile } = await import("../lib/driveTree.mjs");
    const file = await findChildFile(fileName, folderId, { drive });
    if (!file) throw new Error(`File not found: ${drivePath}`);
    fileId = file.id;
  }

  console.log(
    `\n🗑️  ${dryRun ? "[dry-run] would trash" : "Trashing"} Drive file ${fileId}${
      drivePath ? ` (${drivePath})` : ""
    }`,
  );

  if (!dryRun) {
    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
  }

  if (drivePath) {
    const resourceId = resourceIdFromPath(drivePath);
    await deleteResourceById(resourceId, { dryRun });
    console.log(`  Catalog resource ${resourceId} ${dryRun ? "would be" : ""} deleted`);
  } else {
    console.log(
      "  (No path given — Firestore row not deleted. Prefer drive rm <path>.)",
    );
  }
  console.log("");
}

export async function driveMv(argv = []) {
  const apply = argv.includes("--apply");
  const dryRun = !apply || argv.includes("--dry-run");
  const positional = argv.filter((a) => !a.startsWith("-"));
  const [fromPath, toPath] = positional;
  if (!fromPath || !toPath) {
    throw new Error(
      "Usage: drive mv <from-path> <to-folder-or-full-path> --dry-run|--apply\n" +
        "Note: resource IDs are path hashes — move deletes old id and upserts new id.",
    );
  }

  const drive = getWritableDrive();
  const fromParts = fromPath.replace(/\\/g, "/").split("/");
  const fromName = fromParts.pop();
  const fromFolder = fromParts.join("/");
  const { folderId: fromParentId } = await resolveFolderPath(fromFolder, {
    create: false,
    drive: getDrive(),
  });
  const { findChildFile } = await import("../lib/driveTree.mjs");
  const file = await findChildFile(fromName, fromParentId, { drive });
  if (!file) throw new Error(`Source file not found: ${fromPath}`);

  let destFolderPath = toPath.replace(/\\/g, "/");
  let destName = fromName;
  // If toPath looks like a file path (has extension), treat last segment as name
  if (/\.[A-Za-z0-9]{1,8}$/.test(destFolderPath.split("/").pop() || "")) {
    const parts = destFolderPath.split("/");
    destName = parts.pop();
    destFolderPath = parts.join("/");
  }

  const { folderId: destParentId, path: destResolved } =
    await resolveFolderPath(destFolderPath, {
      create: true,
      dryRun,
      drive,
    });

  const newPath = `${destResolved}/${destName}`;
  console.log(
    `\n📦 ${dryRun ? "[dry-run] would move" : "Moving"} ${fromPath} → ${newPath}`,
  );

  if (!dryRun) {
    const meta = await drive.files.get({
      fileId: file.id,
      fields: "parents",
      supportsAllDrives: true,
    });
    const prevParents = (meta.data.parents || []).join(",");
    await drive.files.update({
      fileId: file.id,
      addParents: destParentId,
      removeParents: prevParents,
      requestBody: destName !== fromName ? { name: destName } : undefined,
      supportsAllDrives: true,
      fields: "id, name, modifiedTime",
    });
  }

  const info = dryRun
    ? { id: file.id, modifiedTime: new Date().toISOString() }
    : (
        await drive.files.get({
          fileId: file.id,
          fields: "id, name, modifiedTime",
          supportsAllDrives: true,
        })
      ).data;

  await upsertResources(
    [
      {
        id: info.id || file.id,
        name: destName,
        path: newPath,
        updatedAt: info.modifiedTime,
      },
    ],
    { dryRun, prune: false, updateStats: "bump", verbose: true },
  );

  const oldId = resourceIdFromPath(fromPath.replace(/\\/g, "/"));
  await deleteResourceById(oldId, { dryRun });
  console.log(`  Old catalog id ${oldId} removed; new path hashed.\n`);
}
