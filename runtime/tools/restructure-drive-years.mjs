/**
 * Restructure Google Drive under academic-year folders.
 *
 * 1. Create 2025-2026 (archive) and 2026-2027 (current) under the Drive root.
 * 2. Move existing branch folders (AIDS/CSE/ECE/…) into 2025-2026.
 * 3. Recursively copy 2025-2026 → 2026-2027 (new file IDs).
 * 4. Overlay AIDS Sem 5 OS materials into 2026-2027 AIDS Sem 3.
 *
 * Usage:
 *   node runtime/tools/restructure-drive-years.mjs           # dry-run (default)
 *   node runtime/tools/restructure-drive-years.mjs --apply   # execute
 */
import { getEnv } from "../lib/env.mjs";
import { getWritableDrive, DRIVE_SHARED_OPTS } from "../lib/drive.mjs";
import {
  ACADEMIC_YEAR_PATH_RE,
  isReservedRootFolder,
} from "../lib/academicYear.mjs";

const ARCHIVE_YEAR = "2025-2026";
const CURRENT_YEAR = "2026-2027";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const CAT_RE = /^Sem_(\d+)_(Notes|PPT|PYQ|QB|WriteUps|Codes)$/i;
const OS_SUBJECT_RE = /^(OS|OSL|Operating Systems Laboratory)$/i;

const apply = process.argv.includes("--apply");
const dryRun = !apply;

const drive = getWritableDrive();
const usingOAuth = Boolean(
  getEnv("GOOGLE_CLIENT_ID") &&
    getEnv("GOOGLE_CLIENT_SECRET") &&
    getEnv("GOOGLE_REFRESH_TOKEN"),
);
const rootId = getEnv("GOOGLE_DRIVE_FOLDER_ID");

const stats = {
  foldersCreated: 0,
  branchesMoved: 0,
  filesCopied: 0,
  overlayFilesCopied: 0,
};

async function listChildren(folderId) {
  const out = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, parents)",
      pageSize: 100,
      pageToken,
      orderBy: "folder,name",
      ...DRIVE_SHARED_OPTS,
    });
    out.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

async function findChildFolder(parentId, name) {
  const kids = await listChildren(parentId);
  return kids.find((f) => f.mimeType === FOLDER_MIME && f.name === name) || null;
}

async function ensureFolder(parentId, name, label) {
  const existing = await findChildFolder(parentId, name);
  if (existing) return existing.id;

  if (dryRun) {
    console.log(`  [dry-run] create folder: ${label || name}`);
    stats.foldersCreated++;
    return `dry-run-folder-${name}`;
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
  stats.foldersCreated++;
  console.log(`  📁 Created folder: ${label || name}`);
  return created.data.id;
}

async function moveIntoParent(file, newParentId, label) {
  const parents = file.parents || [];
  if (parents.includes(newParentId)) return;

  if (dryRun) {
    console.log(`  [dry-run] move ${label} → year folder`);
    stats.branchesMoved++;
    return;
  }

  await drive.files.update({
    fileId: file.id,
    addParents: newParentId,
    removeParents: parents.join(","),
    supportsAllDrives: true,
  });
  stats.branchesMoved++;
  console.log(`  ➡️  Moved: ${label}`);
}

async function fileExistsInFolder(name, parentId) {
  const cleanName = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name = '${cleanName}' and '${parentId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
    ...DRIVE_SHARED_OPTS,
  });
  return (res.data.files || []).length > 0;
}

async function copyFile(file, destParentId, label) {
  if (!dryRun && (await fileExistsInFolder(file.name, destParentId))) {
    return null;
  }

  if (dryRun) {
    console.log(`  [dry-run] copy file: ${label}`);
    stats.filesCopied++;
    return null;
  }

  try {
    const res = await drive.files.copy({
      fileId: file.id,
      requestBody: { name: file.name, parents: [destParentId] },
      fields: "id",
      supportsAllDrives: true,
    });
    stats.filesCopied++;
    return res.data.id;
  } catch (err) {
    const msg = String(err?.message || err);
    if (
      !usingOAuth &&
      (msg.includes("storage quota") || msg.includes("Service Accounts do not have"))
    ) {
      throw new Error(
        "Drive copy failed: service accounts cannot copy files without Shared Drive quota. " +
          "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env.local " +
          "(same as upload-drive.mjs) and re-run.",
      );
    }
    throw err;
  }
}

async function copyTreeRecursive(srcFolderId, destParentId, relPath = "") {
  const children = await listChildren(srcFolderId);
  for (const child of children) {
    const childPath = relPath ? `${relPath}/${child.name}` : child.name;
    if (child.mimeType === FOLDER_MIME) {
      const destFolderId = await ensureFolder(destParentId, child.name, childPath);
      await copyTreeRecursive(child.id, destFolderId, childPath);
    } else {
      await copyFile(child, destParentId, childPath);
    }
  }
}

function isBranchFolder(name) {
  return /^[A-Za-z]{2,6}$/.test(name) && !ACADEMIC_YEAR_PATH_RE.test(name);
}

async function stepMoveBranchesToArchive(archiveFolderId, rootChildren) {
  console.log("\n📦 Step 2: Move branch folders into archive year…\n");

  const toMove = rootChildren.filter(
    (f) =>
      f.mimeType === FOLDER_MIME &&
      !isReservedRootFolder(f.name) &&
      !ACADEMIC_YEAR_PATH_RE.test(f.name) &&
      isBranchFolder(f.name),
  );

  if (toMove.length === 0) {
    console.log("  (no branch folders at root — already under year folders)\n");
    return;
  }

  for (const branch of toMove) {
    await moveIntoParent(branch, archiveFolderId, branch.name);
  }
}

async function stepCopyArchiveToCurrent(archiveFolderId, currentFolderId, rootChildren) {
  console.log("\n📋 Step 3: Copy archive tree → current year…\n");

  let archiveKids;
  if (dryRun && String(archiveFolderId).startsWith("dry-run-")) {
    archiveKids = rootChildren.filter(
      (f) =>
        f.mimeType === FOLDER_MIME &&
        !isReservedRootFolder(f.name) &&
        !ACADEMIC_YEAR_PATH_RE.test(f.name) &&
        isBranchFolder(f.name),
    );
    if (archiveKids.length === 0) {
      const existingArchive = await findChildFolder(rootId, ARCHIVE_YEAR);
      if (existingArchive) {
        archiveKids = (await listChildren(existingArchive.id)).filter(
          (f) => f.mimeType === FOLDER_MIME,
        );
      }
    }
  } else {
    archiveKids = (await listChildren(archiveFolderId)).filter(
      (f) => f.mimeType === FOLDER_MIME,
    );
  }

  if (archiveKids.length === 0) {
    console.log("  ⚠️  Archive folder is empty — nothing to copy.\n");
    return;
  }

  const currentKids =
    dryRun && String(currentFolderId).startsWith("dry-run-")
      ? []
      : await listChildren(currentFolderId);
  const hasContent = currentKids.some((f) => f.mimeType === FOLDER_MIME);
  if (hasContent) {
    console.log(
      "  ⚠️  Current year folder already has content — copying on top (duplicate names may coexist).\n",
    );
  }

  for (const child of archiveKids) {
    const destFolderId = await ensureFolder(
      currentFolderId,
      child.name,
      `${CURRENT_YEAR}/${child.name}`,
    );
    await copyTreeRecursive(child.id, destFolderId, `${CURRENT_YEAR}/${child.name}`);
  }
}

async function copySubjectContents(srcSubjectId, destSubjectId, label) {
  const items = await listChildren(srcSubjectId);
  for (const item of items) {
    if (item.mimeType === FOLDER_MIME) {
      const nestedDestId = await ensureFolder(
        destSubjectId,
        item.name,
        `${label}/${item.name}`,
      );
      await copySubjectContents(item.id, nestedDestId, `${label}/${item.name}`);
    } else {
      await copyFile(item, destSubjectId, `${label}/${item.name}`);
      stats.overlayFilesCopied++;
    }
  }
}

async function stepOverlayOsSem3(currentFolderId, rootChildren) {
  console.log("\n🧩 Step 4: Overlay AIDS Sem 5 OS → 2026-2027 AIDS Sem 3…\n");

  let resolvedCurrentId = currentFolderId;
  if (dryRun && String(currentFolderId).startsWith("dry-run-")) {
    const existing = await findChildFolder(rootId, CURRENT_YEAR);
    resolvedCurrentId = existing?.id || null;
    if (!resolvedCurrentId) {
      const archive = await findChildFolder(rootId, ARCHIVE_YEAR);
      const archiveId = archive?.id || null;
      const aidsSource =
        archiveId && (await findChildFolder(archiveId, "AIDS"));
      if (!aidsSource) {
        const rootAids = rootChildren.find((f) => f.name === "AIDS");
        if (rootAids) {
          console.log(
            "  [dry-run] would overlay OS from root AIDS/Sem_5 → 2026-2027/AIDS/Sem_3\n",
          );
          return;
        }
        console.log("  ⚠️  No AIDS folder found for overlay preview.\n");
        return;
      }
      console.log(
        "  [dry-run] would overlay OS from archive AIDS/Sem_5 → 2026-2027/AIDS/Sem_3\n",
      );
      return;
    }
  }

  const aids = await findChildFolder(resolvedCurrentId, "AIDS");
  if (!aids) {
    console.log("  ⚠️  No AIDS folder under current year — skip overlay.\n");
    return;
  }

  const sem5 = await findChildFolder(aids.id, "Sem_5_AIDS");
  const sem3 = await findChildFolder(aids.id, "Sem_3_AIDS");
  if (!sem5 || !sem3) {
    console.log("  ⚠️  Missing Sem_5_AIDS or Sem_3_AIDS — skip overlay.\n");
    return;
  }

  const sem5Cats = (await listChildren(sem5.id)).filter(
    (f) => f.mimeType === FOLDER_MIME && CAT_RE.test(f.name),
  );

  let overlayCount = 0;
  for (const cat of sem5Cats) {
    const catMatch = cat.name.match(CAT_RE);
    if (!catMatch) continue;
    const category = catMatch[2];
    const destCatName = `Sem_3_${category}`;
    const destCat = await findChildFolder(sem3.id, destCatName);
    const destCatId = destCat
      ? destCat.id
      : await ensureFolder(sem3.id, destCatName, `Sem_3_AIDS/${destCatName}`);

    const subjects = (await listChildren(cat.id)).filter(
      (f) => f.mimeType === FOLDER_MIME && OS_SUBJECT_RE.test(f.name),
    );

    for (const subj of subjects) {
      const destSubjId = await ensureFolder(
        destCatId,
        subj.name,
        `${destCatName}/${subj.name}`,
      );
      await copySubjectContents(
        subj.id,
        destSubjId,
        `${CURRENT_YEAR}/AIDS/Sem_3_AIDS/${destCatName}/${subj.name}`,
      );
      overlayCount++;
    }
  }

  console.log(`  ✅ OS overlay: ${overlayCount} subject folder(s) processed.\n`);
}

async function main() {
  if (!rootId) {
    console.error("Missing GOOGLE_DRIVE_FOLDER_ID");
    process.exit(1);
  }

  console.log(
    `\n🗂️  Drive year restructure${dryRun ? " (DRY-RUN — pass --apply to execute)" : ""}\n`,
  );
  console.log(
    usingOAuth
      ? "🔐 Using OAuth user credentials for file copies.\n"
      : "🔐 Using service account (copy may fail without Shared Drive quota).\n",
  );

  const rootChildren = await listChildren(rootId);

  console.log("📁 Step 1: Ensure year folders…\n");
  const archiveFolderId = await ensureFolder(rootId, ARCHIVE_YEAR, ARCHIVE_YEAR);
  const currentFolderId = await ensureFolder(rootId, CURRENT_YEAR, CURRENT_YEAR);

  await stepMoveBranchesToArchive(archiveFolderId, rootChildren);
  await stepCopyArchiveToCurrent(archiveFolderId, currentFolderId, rootChildren);
  await stepOverlayOsSem3(currentFolderId, rootChildren);

  console.log("📊 Summary:");
  console.log(`   Folders created: ${stats.foldersCreated}`);
  console.log(`   Branches moved:  ${stats.branchesMoved}`);
  console.log(`   Files copied:    ${stats.filesCopied}`);
  console.log(`   OS overlay files: ${stats.overlayFilesCopied}`);
  console.log(
    dryRun
      ? "\n✨ Dry-run complete. Re-run with --apply to make changes.\n"
      : "\n✨ Restructure complete.\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
