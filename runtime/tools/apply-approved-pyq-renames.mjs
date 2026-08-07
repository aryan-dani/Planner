/**
 * One-shot: apply user-approved Sem_3 DS/DBMS PYQ renames + year/Sem folders
 * (mirrors AIDS Sem_4_PYQ/<Subject>/<Year>/[Sem_N]/ layout).
 *
 * Usage:
 *   node runtime/tools/apply-approved-pyq-renames.mjs --dry-run
 *   node runtime/tools/apply-approved-pyq-renames.mjs --apply
 */
import { getEnv } from "../lib/env.mjs";
import { getDrive } from "../lib/drive.mjs";

const apply = process.argv.includes("--apply");
const dryRun = !apply;

const FOLDER_MIME = "application/vnd.google-apps.folder";
const drive = getDrive(["https://www.googleapis.com/auth/drive"]);
const rootId = getEnv("GOOGLE_DRIVE_FOLDER_ID");

/**
 * From screenshots (schedule-id / opaque names → convention + year/Sem folders).
 * destRelative is under AIDS/Sem_3_AIDS/Sem_3_PYQ/
 */
const JOBS = [
  // DS — May-June 2023 End, Term IV (EEE2005B DSA)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DS",
    fromName: "18377.pdf",
    destFolders: ["DS", "2023", "Sem_4"],
    newName: "DS_PYQ_2023_End_1.pdf",
  },
  // DS — May-June 2023 End, Term III (EC213/CET2001A DSA)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DS",
    fromName: "18412.pdf",
    destFolders: ["DS", "2023", "Sem_3"],
    newName: "DS_PYQ_2023_End_1.pdf",
  },
  // DS — May-June 2023 End, Sem III (CET0004B ADS)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DS",
    fromName: "19327.pdf",
    destFolders: ["DS", "2023", "Sem_3"],
    newName: "DS_PYQ_2023_End_2.pdf",
  },
  // DS — May-June 2023 End, Term III (CET1043B FDS)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DS",
    fromName: "19590.pdf",
    destFolders: ["DS", "2023", "Sem_3"],
    newName: "DS_PYQ_2023_End_3.pdf",
  },
  // DS — July-Aug 2023 End, Term IV (EEE2005B DSA)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DS",
    fromName: "20408.pdf",
    destFolders: ["DS", "2023", "Sem_4"],
    newName: "DS_PYQ_2023_End_2.pdf",
  },
  // DS — duplicate of 18412 (same schedule id on paper)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DS",
    fromName: "dspaper.pdf",
    destFolders: ["DS", "2023", "Sem_3"],
    newName: "DS_PYQ_2023_End_4.pdf",
  },
  // DS — Dec 2023 Term End, Sem III (CET1043B FDS)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DS",
    fromName: "SKM_22725041813340_0053.pdf",
    destFolders: ["DS", "2023", "Sem_3"],
    newName: "DS_PYQ_2023_End_5.pdf",
  },
  // DBMS — Make-up Aug 2024, Sem V (CET2002B DBMS)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DBMS",
    fromName: "dbms_endsem_1.pdf",
    destFolders: ["DBMS", "2024", "Sem_5"],
    newName: "DBMS_PYQ_2024_End_1.pdf",
  },
  // DBMS — May-June 2023 End, Sem IV (CET1002B RDBMS)
  {
    fromPath: "AIDS/Sem_3_AIDS/Sem_3_PYQ/DBMS",
    fromName: "dbms_endsem_2.pdf",
    destFolders: ["DBMS", "2023", "Sem_4"],
    newName: "DBMS_PYQ_2023_End_1.pdf",
  },
];

async function listChildren(folderId) {
  const out = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    out.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

async function resolvePath(parts) {
  let id = rootId;
  for (const part of parts) {
    const kids = await listChildren(id);
    const hit = kids.find((f) => f.name === part);
    if (!hit) return null;
    id = hit.id;
  }
  return id;
}

async function getOrCreateFolder(name, parentId) {
  const kids = await listChildren(parentId);
  const existing = kids.find(
    (f) => f.mimeType === FOLDER_MIME && f.name === name,
  );
  if (existing) return existing.id;
  if (dryRun) {
    console.log(`  [dry-run] would create folder: ${name} under ${parentId}`);
    return `dry-run:${name}`;
  }
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id, name",
    supportsAllDrives: true,
  });
  console.log(`  📁 Created: ${name}`);
  return created.data.id;
}

async function ensureFolderPath(baseId, folders) {
  let id = baseId;
  for (const name of folders) {
    if (String(id).startsWith("dry-run:")) {
      id = `dry-run:${name}`;
      console.log(`  [dry-run] ensure folder: ${name}`);
      continue;
    }
    id = await getOrCreateFolder(name, id);
  }
  return id;
}

async function moveAndRename(fileId, newName, newParentId, oldParentId, label) {
  if (dryRun || String(newParentId).startsWith("dry-run:")) {
    console.log(`  [dry-run] ${label} → ${newName} (move)`);
    return;
  }
  await drive.files.update({
    fileId,
    requestBody: { name: newName },
    addParents: newParentId,
    removeParents: oldParentId,
    supportsAllDrives: true,
    fields: "id, name, parents",
  });
  console.log(`  ✅ ${label} → ${newName}`);
}

async function main() {
  if (!rootId) {
    console.error("Missing GOOGLE_DRIVE_FOLDER_ID");
    process.exit(1);
  }

  console.log(
    `\n📚 Approved Sem_3 DS/DBMS PYQ organize ${dryRun ? "(dry-run)" : "(APPLY)"}\n`,
  );

  const pyqRootId = await resolvePath([
    "AIDS",
    "Sem_3_AIDS",
    "Sem_3_PYQ",
  ]);
  if (!pyqRootId) {
    console.error("Could not find AIDS/Sem_3_AIDS/Sem_3_PYQ");
    process.exit(1);
  }

  let ok = 0;
  let missing = 0;

  for (const job of JOBS) {
    const fromParts = job.fromPath.split("/");
    const fromFolderId = await resolvePath(fromParts);
    if (!fromFolderId) {
      console.error(`  ❌ Missing folder: ${job.fromPath}`);
      missing++;
      continue;
    }
    const kids = await listChildren(fromFolderId);
    const file = kids.find(
      (f) => f.mimeType !== FOLDER_MIME && f.name === job.fromName,
    );
    if (!file) {
      console.error(`  ❌ Missing file: ${job.fromPath}/${job.fromName}`);
      missing++;
      continue;
    }

    const destId = await ensureFolderPath(pyqRootId, job.destFolders);
    const destLabel = `Sem_3_PYQ/${job.destFolders.join("/")}/${job.newName}`;
    console.log(`  ${job.fromName} → ${destLabel}`);
    await moveAndRename(
      file.id,
      job.newName,
      destId,
      fromFolderId,
      `${job.fromPath}/${job.fromName}`,
    );
    ok++;
  }

  console.log(`\n✨ Done. Processed ${ok}/${JOBS.length} (missing ${missing}).`);
  if (dryRun) {
    console.log("Re-run with --apply to create folders and move/rename.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
