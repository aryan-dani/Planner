/**
 * Lists Google Drive folder tree under GOOGLE_DRIVE_FOLDER_ID.
 * Usage: node runtime/tools/list-drive.mjs [depth=4]
 */
import { env } from "../lib/env.mjs";
import { getDrive } from "../lib/drive.mjs";

const maxDepth = Number(process.argv[2] || 4);
const drive = getDrive(["https://www.googleapis.com/auth/drive"]);

async function listFolder(folderId, prefix = "", depth = 0) {
  if (depth > maxDepth) return;
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 100,
      pageToken,
      orderBy: "folder,name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const files = res.data.files || [];
    for (const file of files) {
      const isFolder = file.mimeType === "application/vnd.google-apps.folder";
      console.log(`${prefix}${isFolder ? "📁" : "📄"} ${file.name}  (${file.id})`);
      if (isFolder) {
        await listFolder(file.id, prefix + "  ", depth + 1);
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
}

const root = env["GOOGLE_DRIVE_FOLDER_ID"];
if (!root) {
  console.error("Missing GOOGLE_DRIVE_FOLDER_ID");
  process.exit(1);
}
console.log(`Root: ${root}\n`);
await listFolder(root);
