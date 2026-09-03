/**
 * Overwrite specific Drive files by exact name (OAuth preferred).
 * Usage: node runtime/tools/overwrite-drive-files.mjs <localDir>
 * Walks localDir; for each file, finds matching name under GOOGLE_DRIVE_FOLDER_ID tree and updates media.
 */
import { existsSync, readdirSync, statSync, createReadStream } from "fs";
import { join, basename } from "path";
import { google } from "googleapis";
import syncDrive from "./sync-drive.mjs";
import { getEnv } from "../lib/env.mjs";
import { getDrive } from "../lib/drive.mjs";

const driveFolderId = getEnv("GOOGLE_DRIVE_FOLDER_ID");
if (!driveFolderId) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID");

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
    console.log("🔐 Using OAuth user credentials\n");
    return google.drive({ version: "v3", auth: oauth2Client });
  }
  return getDrive(["https://www.googleapis.com/auth/drive"]);
}

const drive = getUploadDrive();

async function findFileIdsByName(name) {
  const cleanName = name.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
  const res = await drive.files.list({
    q,
    fields: "files(id, name, parents)",
    pageSize: 20,
    ...DRIVE_OPTS,
  });
  return res.data.files || [];
}

async function overwriteFile(localPath) {
  const name = basename(localPath);
  const matches = await findFileIdsByName(name);
  if (matches.length === 0) {
    console.log(`  ⚠️  Not found on Drive (skip create): ${name}`);
    return false;
  }
  for (const f of matches) {
    console.log(`  ♻️  Updating: ${name} (${f.id})...`);
    await drive.files.update({
      fileId: f.id,
      media: { body: createReadStream(localPath) },
      supportsAllDrives: true,
      fields: "id, name",
    });
    console.log(`  ✅ Updated: ${name}`);
  }
  return true;
}

function collectFiles(dir, out = []) {
  for (const item of readdirSync(dir)) {
    const p = join(dir, item);
    if (statSync(p).isDirectory()) collectFiles(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  const localTarget = process.argv[2];
  if (!localTarget || !existsSync(localTarget)) {
    console.error("Usage: node runtime/tools/overwrite-drive-files.mjs <local_directory>");
    process.exit(1);
  }
  const files = collectFiles(localTarget);
  console.log(`\n♻️  Overwriting ${files.length} file(s) from ${localTarget}\n`);
  for (const f of files) {
    await overwriteFile(f);
  }
  console.log("\n🔄 Syncing Drive → Firestore…\n");
  await syncDrive();
  console.log("\n🎉 Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
