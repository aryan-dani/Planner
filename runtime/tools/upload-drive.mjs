/**
 * Recursively upload a local folder into the configured Google Drive tree.
 *
 * Usage:
 *   node runtime/tools/upload-drive.mjs <local_directory> [--overwrite] [--year=YYYY-YYYY] [--dry-run] [--no-sync]
 *
 * --overwrite  Update existing files in the same folder (path-scoped). Default: skip.
 * --year       Nest Sem_* uploads under this year folder when year folders exist.
 * --dry-run    Print actions only.
 * --no-sync    Skip Drive → Firestore sync after upload.
 */
import { existsSync, readdirSync, statSync, createReadStream } from "fs";
import { join, basename } from "path";
import syncDrive from "./sync-drive.mjs";
import { getEnv } from "../lib/env.mjs";
import { getWritableDrive, DRIVE_SHARED_OPTS } from "../lib/drive.mjs";
import {
  ACADEMIC_YEAR_PATH_RE,
  DEFAULT_ACADEMIC_YEAR,
} from "../lib/academicYear.mjs";

const driveFolderId = getEnv("GOOGLE_DRIVE_FOLDER_ID");
if (!driveFolderId) {
  throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in .env.local");
}

function parseArgs(argv) {
  const flags = {
    overwrite: false,
    dryRun: false,
    noSync: false,
    year: null,
    localTarget: null,
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--overwrite" || arg === "--force") flags.overwrite = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--no-sync") flags.noSync = true;
    else if (arg.startsWith("--year=")) flags.year = arg.slice("--year=".length).trim();
    else if (!arg.startsWith("-") && !flags.localTarget) flags.localTarget = arg;
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  if (flags.year && !ACADEMIC_YEAR_PATH_RE.test(flags.year)) {
    console.error(`Invalid --year=${flags.year}. Expected YYYY-YYYY.`);
    process.exit(1);
  }

  return flags;
}

const opts = parseArgs(process.argv);
const stats = { created: 0, updated: 0, skipped: 0, folders: 0, failed: 0 };

const drive = getWritableDrive();
console.log("Using writable Drive client\n");

async function getOrCreateFolder(name, parentId) {
  const cleanName = name.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 1,
    ...DRIVE_SHARED_OPTS,
  });
  const files = res.data.files || [];
  if (files.length > 0) return files[0].id;

  if (opts.dryRun) {
    console.log(`  [dry-run] would create folder: ${name}`);
    stats.folders += 1;
    return parentId;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  console.log(`  Created remote folder: ${name}`);
  stats.folders += 1;
  return folder.data.id;
}

async function fileExistsInFolder(name, parentId) {
  const cleanName = name.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and '${parentId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 1,
    ...DRIVE_SHARED_OPTS,
  });
  const files = res.data.files || [];
  return files.length > 0 ? files[0].id : null;
}

async function yearFolderExists(yearName) {
  const cleanName = yearName.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and '${driveFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: "files(id)",
    pageSize: 1,
    ...DRIVE_SHARED_OPTS,
  });
  return (res.data.files || [])[0]?.id ?? null;
}

async function anyYearFolderExists() {
  const q = `'${driveFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const folders = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(id, name)",
      pageSize: 100,
      pageToken,
      ...DRIVE_SHARED_OPTS,
    });
    folders.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken ?? null;
  } while (pageToken);
  return folders.some((f) => ACADEMIC_YEAR_PATH_RE.test(f.name));
}

async function uploadFile(itemPath, name, parentId) {
  const existingId = await fileExistsInFolder(name, parentId);

  if (existingId && !opts.overwrite) {
    console.log(`  Skip existing: ${name}`);
    stats.skipped += 1;
    return;
  }

  if (opts.dryRun) {
    console.log(`  [dry-run] would ${existingId ? "update" : "upload"}: ${name}`);
    if (existingId) stats.updated += 1;
    else stats.created += 1;
    return;
  }

  try {
    if (existingId) {
      console.log(`  Updating: ${name}`);
      await drive.files.update({
        fileId: existingId,
        media: { body: createReadStream(itemPath) },
        supportsAllDrives: true,
        fields: "id",
      });
      console.log(`  Updated: ${name}`);
      stats.updated += 1;
      return;
    }

    console.log(`  Uploading: ${name}`);
    await drive.files.create({
      requestBody: { name, parents: [parentId] },
      media: { body: createReadStream(itemPath) },
      fields: "id",
      supportsAllDrives: true,
    });
    console.log(`  Uploaded: ${name}`);
    stats.created += 1;
  } catch (err) {
    stats.failed += 1;
    console.error(`  Failed: ${name} — ${err.message}`);
  }
}

async function uploadDirectory(localPath, driveParentId) {
  const items = readdirSync(localPath);
  for (const item of items) {
    if (item.startsWith(".") || item === "node_modules") continue;
    const itemPath = join(localPath, item);
    const stat = statSync(itemPath);
    if (stat.isDirectory()) {
      const subFolderId = await getOrCreateFolder(item, driveParentId);
      await uploadDirectory(itemPath, subFolderId);
    } else {
      await uploadFile(itemPath, item, driveParentId);
    }
  }
}

async function resolveUploadRoot(localTarget) {
  const targetFolderBasename = basename(localTarget);
  const semMatch = targetFolderBasename.match(/Sem_\d+_(.+)/i);
  const yearHint = opts.year || DEFAULT_ACADEMIC_YEAR;
  const yearsExist = await anyYearFolderExists();

  if (ACADEMIC_YEAR_PATH_RE.test(targetFolderBasename)) {
    const yearFolderId = await getOrCreateFolder(targetFolderBasename, driveFolderId);
    return yearFolderId;
  }

  if (semMatch) {
    const branchName = semMatch[1].toUpperCase();
    let branchParentId = driveFolderId;
    if (yearsExist) {
      branchParentId = await getOrCreateFolder(yearHint, driveFolderId);
    }
    const branchFolderId = await getOrCreateFolder(branchName, branchParentId);
    return getOrCreateFolder(targetFolderBasename, branchFolderId);
  }

  if (yearsExist) {
    return getOrCreateFolder(yearHint, driveFolderId);
  }
  return driveFolderId;
}

async function startUpload() {
  const { localTarget } = opts;

  if (!localTarget || !existsSync(localTarget)) {
    console.error("Please specify a valid local directory path to upload.");
    console.log(
      "Usage: node runtime/tools/upload-drive.mjs <local_directory> [--overwrite] [--year=YYYY-YYYY] [--dry-run] [--no-sync]",
    );
    process.exit(1);
  }

  if (!statSync(localTarget).isDirectory()) {
    console.error("Target path is a file; pass a directory.");
    process.exit(1);
  }

  const yearHint = opts.year || DEFAULT_ACADEMIC_YEAR;
  console.log(`\nStarting Drive upload from: ${localTarget}`);
  console.log(
    `  overwrite=${opts.overwrite} dry-run=${opts.dryRun} year=${yearHint} sync=${!opts.noSync}\n`,
  );

  try {
    const parentId = await resolveUploadRoot(localTarget);
    await uploadDirectory(localTarget, parentId);

    console.log(
      `\nDone. created=${stats.created} updated=${stats.updated} skipped=${stats.skipped} folders=${stats.folders} failed=${stats.failed}`,
    );

    if (stats.failed > 0) process.exitCode = 1;

    if (!opts.dryRun && !opts.noSync) {
      await syncDrive();
    }
  } catch (error) {
    console.error(`\nUpload failed: ${error.message}`);
    process.exit(1);
  }
}

startUpload();
