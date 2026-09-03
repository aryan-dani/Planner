/**
 * runtime/tools/sync-drive.mjs
 * Synchronizes Google Drive Shared Folder contents with the Firestore Database.
 * Scans Google Drive directory recursively and updates 'subjects' and 'resources' collections.
 */

import { db } from "../lib/firebase.mjs";
import crypto from "crypto";
import path from "path";
import { pathToFileURL } from "url";
import { getEnv } from "../lib/env.mjs";
import { getDrive } from "../lib/drive.mjs";
import {
  parseAcademicYearFromPath,
  LEGACY_ACADEMIC_YEAR,
} from "../lib/academicYear.mjs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(input) {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(12, 15)}-a${hash.substring(15, 18)}-${hash.substring(18, 30)}`;
}

/** Recursively retrieve all files from a Google Drive folder */
async function retrieveAllFiles(folderId, currentPath = "") {
  const filesList = [];
  let pageToken = null;
  const drive = getDrive();

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
      pageSize: 100,
      pageToken: pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = res.data.files || [];
    for (const file of files) {
      const relativePath = currentPath
        ? `${currentPath}/${file.name}`
        : file.name;
      if (file.mimeType === "application/vnd.google-apps.folder") {
        const subFiles = await retrieveAllFiles(file.id, relativePath);
        filesList.push(...subFiles);
      } else {
        filesList.push({
          id: file.id,
          name: file.name,
          path: relativePath,
          updatedAt: file.modifiedTime,
        });
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return filesList;
}

// ── Sync Process ──────────────────────────────────────────────────────────────

async function syncDrive(options = {}) {
  const dryRun = options.dryRun === true || process.argv.includes("--dry-run");
  const subjectArg =
    options.subject ||
    (() => {
      const eq = process.argv.find((a) => a.startsWith("--subject="));
      if (eq) return eq.slice("--subject=".length);
      const idx = process.argv.indexOf("--subject");
      if (idx >= 0 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("-")) {
        return process.argv[idx + 1];
      }
      return null;
    })();
  const subjectFilter = subjectArg ? String(subjectArg).trim().toLowerCase() : null;

  console.log(
    `\n🚀 Starting Google Drive Sync...${dryRun ? " (dry-run)" : ""}${
      subjectFilter ? ` [subject≈${subjectArg}]` : ""
    }\n`,
  );

  try {
    const driveFolderId = getEnv("GOOGLE_DRIVE_FOLDER_ID");
    if (!driveFolderId) {
      throw new Error(
        "❌ Missing GOOGLE_DRIVE_FOLDER_ID in environment variables.",
      );
    }
    const files = await retrieveAllFiles(driveFolderId);
    console.log(`📦 Found ${files.length} files in Google Drive folder.\n`);

    const stats = {
      subjects: 0,
      resources: 0,
      skipped: 0,
      deletedResources: 0,
      deletedSubjects: 0,
      reindexFlagged: 0,
    };
    const liveSubjectIds = new Set();
    const liveResourceIds = new Set();
    const syncedSubjectIds = new Set();

    for (const file of files) {
      // Expected path: [optional_branch_parent/]Semester_Branch/Category/Subject/File
      const parts = file.path.split("/");
      if (parts.length < 1) continue;

      const academicYear = parseAcademicYearFromPath(parts);

      const semIndex = parts.findIndex((p) => p.match(/Sem_(\d+)_(\w+)/i));

      if (semIndex === -1) {
        console.log(`  ⚠️  Skipping non-standard path: ${file.path}`);
        stats.skipped++;
        continue;
      }

      const semBranchFolder = parts[semIndex];
      const semMatch = semBranchFolder.match(/Sem_(\d+)_(\w+)/i);
      const semester = parseInt(semMatch[1]);
      const branch = semMatch[2].toUpperCase();

      let subjectName = "General";
      let fileName = parts[parts.length - 1];

      // Syllabus special case
      if (fileName.toLowerCase().includes("syllabus")) {
        subjectName = "Syllabus";
      } else if (parts.length >= semIndex + 4) {
        subjectName = parts[semIndex + 2];
      } else if (parts.length === semIndex + 3) {
        subjectName = "General";
      }

      // Clean subject name
      subjectName = subjectName
        .replace(/_/g, " ")
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      if (
        subjectFilter &&
        !subjectName.toLowerCase().includes(subjectFilter)
      ) {
        stats.skipped++;
        continue;
      }

      // 1. Sync Subject to Firestore
      const subjectId = generateId(
        `subject-${academicYear}-${branch}-${semester}-${subjectName.toLowerCase()}`,
      );
      const subjectRef = db.collection("subjects").doc(subjectId);
      if (!syncedSubjectIds.has(subjectId)) {
        if (!dryRun) {
          await subjectRef.set(
            {
              name: subjectName,
              branch: branch,
              semester: semester,
              academic_year: academicYear,
            },
            { merge: true },
          );
        }
        syncedSubjectIds.add(subjectId);
        stats.subjects++;
      }
      liveSubjectIds.add(subjectId);

      // 2. Sync Resource to Firestore
      // Instead of forcing a download, use the Google Drive preview link so it opens nicely in an iframe
      const fileUrl = `https://drive.google.com/file/d/${file.id}/preview`;
      const resourceId = generateId(file.path);
      const resourceRef = db.collection("resources").doc(resourceId);

      let category = "other";
      if (parts.length >= semIndex + 2) {
        const catSegment = parts[semIndex + 1].toLowerCase();
        if (catSegment.includes("notes")) category = "notes";
        else if (
          catSegment.includes("ppt") ||
          catSegment.includes("presentation")
        )
          category = "ppt";
        else if (catSegment.includes("pyq")) category = "pyq";
        else if (
          catSegment.includes("qb") ||
          catSegment.includes("question_bank")
        ) {
          category = fileName.toLowerCase().includes("solved")
            ? "solved-question-bank"
            : "question-bank";
        } else if (catSegment.includes("writeup")) category = "writeup";
        else if (catSegment.includes("code")) category = "codes";
      }

      const driveModifiedAt = file.updatedAt || new Date().toISOString();
      const existingSnap = await resourceRef.get();
      const existing = existingSnap.exists ? existingSnap.data() : null;
      const contentChanged =
        !existing ||
        existing.drive_modified_at !== driveModifiedAt ||
        existing.file_url !== fileUrl;

      const payload = {
        title: fileName,
        file_url: fileUrl,
        subject_id: subjectId,
        category: category,
        academic_year: academicYear,
        branch,
        semester,
        created_at: existing?.created_at || driveModifiedAt,
        drive_modified_at: driveModifiedAt,
      };

      // Clear indexed hashes so index-content re-extracts updated Drive files.
      if (contentChanged && existing?.content_hash) {
        payload.content_hash = null;
        payload.ai_summary = null;
        stats.reindexFlagged++;
      }

      if (!dryRun) {
        await resourceRef.set(payload, { merge: true });
        if (contentChanged && existing?.content_hash) {
          await db.collection("resource_content").doc(resourceId).set(
            { content_hash: null, ai_summary: null },
            { merge: true },
          );
        }
      }

      liveResourceIds.add(resourceId);
      stats.resources++;

      console.log(
        `  ✅ Synced: ${fileName.substring(0, 30).padEnd(30)} [${subjectName}]${contentChanged && existing?.content_hash ? " (reindex)" : ""}`,
      );
    }

    // 3. Cleanup Stale Data
    console.log(`\n🧹 Cleaning up stale database records...`);

    // Fetch all current resources in Firestore
    const allResourcesSnap = await db.collection("resources").get();
    const staleResourceIds = [];
    allResourcesSnap.forEach((doc) => {
      if (liveResourceIds.has(doc.id)) return;
      if (subjectFilter) {
        // Scoped sync: only prune resources under subjects we touched
        const sid = doc.data()?.subject_id;
        if (!liveSubjectIds.has(sid)) return;
      }
      staleResourceIds.push(doc.id);
    });

    if (staleResourceIds.length > 0) {
      console.log(
        `  🗑️ Deleting ${staleResourceIds.length} stale resources${dryRun ? " (dry-run)" : ""}${
          subjectFilter ? " (subject-scoped)" : ""
        }...`,
      );
      if (!dryRun) {
        const chunkSize = 40;
        for (let i = 0; i < staleResourceIds.length; i += chunkSize) {
          const chunk = staleResourceIds.slice(i, i + chunkSize);
          const batch = db.batch();
          for (const id of chunk) {
            batch.delete(db.collection("resources").doc(id));
            batch.delete(db.collection("resource_content").doc(id));
          }
          await batch.commit();

          // Also delete orphan RAG chunks for each stale resource
          for (const id of chunk) {
            const chunkSnap = await db
              .collection("resource_chunks")
              .where("resource_id", "==", id)
              .limit(500)
              .get();
            if (chunkSnap.empty) continue;
            const chunkBatch = db.batch();
            chunkSnap.docs.forEach((d) => chunkBatch.delete(d.ref));
            await chunkBatch.commit();
          }

          if (staleResourceIds.length > chunkSize) {
            console.log(
              `     … deleted ${Math.min(i + chunkSize, staleResourceIds.length)}/${staleResourceIds.length}`,
            );
          }
        }
      }
      stats.deletedResources = staleResourceIds.length;
    }

    // Fetch all current subjects in Firestore (skip full prune when subject-scoped)
    if (!subjectFilter) {
      const allSubjectsSnap = await db.collection("subjects").get();
      const staleSubjectIds = [];
      allSubjectsSnap.forEach((doc) => {
        if (!liveSubjectIds.has(doc.id)) {
          staleSubjectIds.push(doc.id);
        }
      });

      if (staleSubjectIds.length > 0) {
        console.log(
          `  🗑️ Deleting ${staleSubjectIds.length} stale subjects${dryRun ? " (dry-run)" : ""}...`,
        );
        if (!dryRun) {
          const chunkSize = 200;
          for (let i = 0; i < staleSubjectIds.length; i += chunkSize) {
            const chunk = staleSubjectIds.slice(i, i + chunkSize);
            const batch = db.batch();
            for (const id of chunk) {
              batch.delete(db.collection("subjects").doc(id));
            }
            await batch.commit();
          }
        }
        stats.deletedSubjects = staleSubjectIds.length;
      }
    } else {
      console.log(
        `  ⏭️ Skipping subject prune (subject-scoped sync: ${subjectArg})`,
      );
    }

    console.log(`\n✨ Sync Complete!`);
    console.log(`   - Resources Synced: ${stats.resources}`);
    console.log(`   - Reindex Flagged: ${stats.reindexFlagged}`);
    console.log(`   - Resources Deleted: ${stats.deletedResources}`);
    console.log(`   - Subjects Synced: ${liveSubjectIds.size}`);
    console.log(`   - Subjects Deleted: ${stats.deletedSubjects}`);
    console.log(`   - Files Skipped: ${stats.skipped}\n`);
  } catch (error) {
    console.error(`\n❌ Sync failed: ${error.message}`);
    if (error.stack) console.error(error.stack);
    throw error;
  }
}

// Allow running directly (safe when imported by Next.js / other tools)
const isDirectRun =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  syncDrive()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default syncDrive;
