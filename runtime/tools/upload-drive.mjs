/**
 * runtime/tools/upload-drive.mjs
 * Recursively uploads a local folder to the configured Google Drive folder.
 * Prefers user OAuth (quota) when GOOGLE_CLIENT_* + GOOGLE_REFRESH_TOKEN are set;
 * otherwise falls back to the Firebase service account (Shared Drives only).
 * Triggers Drive → Firestore sync when upload finishes.
 *
 * Usage: node runtime/tools/upload-drive.mjs <local_directory_path>
 */
import { existsSync, readdirSync, statSync, createReadStream } from "fs";
import { join, basename } from "path";
import { google } from "googleapis";
import syncDrive from "./sync-drive.mjs";
import { getEnv } from "../lib/env.mjs";
import { getDrive } from "../lib/drive.mjs";
import {
  ACADEMIC_YEAR_PATH_RE,
  DEFAULT_ACADEMIC_YEAR,
} from "../lib/academicYear.mjs";

const driveFolderId = getEnv("GOOGLE_DRIVE_FOLDER_ID");
if (!driveFolderId) {
  throw new Error("❌ Missing GOOGLE_DRIVE_FOLDER_ID in .env.local");
}

const DRIVE_OPTS = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
};

function getUploadDrive() {
  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = getEnv("GOOGLE_REFRESH_TOKEN");

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    console.log("🔐 Using OAuth user credentials for upload\n");
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  console.log(
    "🔐 Using service account (requires Shared Drive storage quota)\n",
  );
  return getDrive(["https://www.googleapis.com/auth/drive"]);
}

const drive = getUploadDrive();

async function getOrCreateFolder(name, parentId) {
  const cleanName = name.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 1,
    ...DRIVE_OPTS,
  });

  const files = res.data.files || [];
  if (files.length > 0) return files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  console.log(`  📁 Created remote folder: ${name}`);
  return folder.data.id;
}

async function fileExistsInFolder(name, parentId) {
  const cleanName = name.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and '${parentId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 1,
    ...DRIVE_OPTS,
  });

  const files = res.data.files || [];
  return files.length > 0 ? files[0].id : null;
}

async function uploadDirectory(localPath, driveParentId) {
  const items = readdirSync(localPath);

  for (const item of items) {
    const itemPath = join(localPath, item);
    const stat = statSync(itemPath);

    if (stat.isDirectory()) {
      const subFolderId = await getOrCreateFolder(item, driveParentId);
      await uploadDirectory(itemPath, subFolderId);
    } else {
      const existingId = await fileExistsInFolder(item, driveParentId);
      if (existingId) {
        console.log(`  ⏭️  Skipping existing file: ${item}`);
        continue;
      }

      console.log(`  ⬆️  Uploading: ${item}...`);
      await drive.files.create({
        requestBody: {
          name: item,
          parents: [driveParentId],
        },
        media: {
          body: createReadStream(itemPath),
        },
        fields: "id",
        supportsAllDrives: true,
      });
      console.log(`  ✅ Uploaded: ${item}`);
    }
  }
}

async function yearFolderExistsAtRoot() {
  const cleanName = DEFAULT_ACADEMIC_YEAR.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and '${driveFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: "files(id)",
    pageSize: 1,
    ...DRIVE_OPTS,
  });
  return (res.data.files || []).length > 0;
}

async function resolveBranchParentId() {
  if (await yearFolderExistsAtRoot()) {
    return getOrCreateFolder(DEFAULT_ACADEMIC_YEAR, driveFolderId);
  }
  return driveFolderId;
}

async function startUpload() {
  const localTarget = process.argv[2];

  if (!localTarget || !existsSync(localTarget)) {
    console.error(
      "❌ Error: Please specify a valid local directory path to upload.",
    );
    console.log(
      "Usage: node runtime/tools/upload-drive.mjs <local_directory_path>",
    );
    process.exit(1);
  }

  if (!statSync(localTarget).isDirectory()) {
    console.error("❌ Error: Target path is a file, must be a directory.");
    process.exit(1);
  }

  console.log(`\n📤 Starting Google Drive Upload from: ${localTarget}\n`);

  try {
    const targetFolderBasename = basename(localTarget);
    const semMatch = targetFolderBasename.match(/Sem_\d+_(.+)/i);

    if (ACADEMIC_YEAR_PATH_RE.test(targetFolderBasename)) {
      const yearFolderId = await getOrCreateFolder(
        targetFolderBasename,
        driveFolderId,
      );
      await uploadDirectory(localTarget, yearFolderId);
    } else if (semMatch) {
      const branchName = semMatch[1].toUpperCase();
      const branchParentId = await resolveBranchParentId();
      const branchFolderId = await getOrCreateFolder(branchName, branchParentId);
      const targetParentId = await getOrCreateFolder(
        targetFolderBasename,
        branchFolderId,
      );
      await uploadDirectory(localTarget, targetParentId);
    } else {
      await uploadDirectory(localTarget, driveFolderId);
    }

    console.log(`\n🎉 Upload completed successfully!`);
    await syncDrive();
  } catch (error) {
    console.error(`\n❌ Upload failed: ${error.message}`);
    process.exit(1);
  }
}

startUpload();
