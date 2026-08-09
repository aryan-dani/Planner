/**
 * Audit / rename Drive files to the project naming convention and trash junk.
 *
 * Usage:
 *   node runtime/tools/rename-drive-files.mjs --dry-run
 *   node runtime/tools/rename-drive-files.mjs --apply
 *   node runtime/tools/rename-drive-files.mjs --apply --trash-only
 *   node runtime/tools/rename-drive-files.mjs --dry-run --branch=AIDS
 *   node runtime/tools/rename-drive-files.mjs --dry-run --report=drive-rename-report.json
 */
import { writeFileSync } from "fs";
import { getEnv } from "../lib/env.mjs";
import { getDrive } from "../lib/drive.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dryRun = !apply || args.includes("--dry-run");
const trashOnly = args.includes("--trash-only");
const branchFilter = (
  args.find((a) => a.startsWith("--branch=")) || ""
).slice("--branch=".length).toUpperCase() || null;
const reportPath =
  (args.find((a) => a.startsWith("--report=")) || "").slice("--report=".length) ||
  "drive-rename-report.json";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SEM_RE = /^Sem_(\d+)_(\w+)$/i;
const CAT_RE = /^Sem_(\d+)_(Notes|PPT|PYQ|QB|WriteUps|Codes)$/i;

const MIME_EXT = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
  "application/vnd.ms-powerpoint": ".ppt",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "text/plain": ".txt",
  "text/html": ".htm",
};

const drive = getDrive(["https://www.googleapis.com/auth/drive"]);
const rootId = getEnv("GOOGLE_DRIVE_FOLDER_ID");

function splitName(name) {
  const m = name.match(/^(.*?)(\.[A-Za-z0-9]{1,8})?$/);
  if (!m) return { base: name, ext: "" };
  // Prefer last extension-like suffix
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return { base: name, ext: "" };
  const ext = name.slice(idx);
  if (!/^\.[A-Za-z0-9]{1,8}$/.test(ext)) return { base: name, ext: "" };
  return { base: name.slice(0, idx), ext };
}

function sanitizeBase(base) {
  let s = base
    .replace(/\*/g, "_")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  // UNIT / unit → Unit (token-aware)
  s = s.replace(/\bUNIT\b/g, "Unit");
  s = s.replace(/_UNIT_/gi, "_Unit_");
  s = s.replace(/^UNIT_/i, "Unit_");
  s = s.replace(/_UNIT$/i, "_Unit");
  s = s.replace(/_unit_/g, "_Unit_");
  s = s.replace(/^unit_/g, "Unit_");
  s = s.replace(/_unit$/g, "_Unit");

  // WriteUp-N already became WriteUp_N via hyphen→underscore
  s = s.replace(/Write[\s_]*Up[_-]?/gi, "WriteUp_");
  s = s.replace(/WriteUp_+/g, "WriteUp_");

  // PBL_II style (PBL-II → PBL_II)
  s = s.replace(/PBL_II/gi, "PBL_II");
  s = s.replace(/PBL_I(?!I)/gi, "PBL_I");
  s = s.replace(/PBL_III/gi, "PBL_III");

  s = s.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return s;
}

function isJunk(name, mimeType) {
  const n = name.toLowerCase();
  if (n === ".emptyfolderplaceholder" || n.startsWith(".emptyfolderplaceholder")) {
    return "emptyFolderPlaceholder";
  }
  if (n.startsWith("whatsapp") || n.includes("whatsapp_image")) {
    return "WhatsApp media";
  }
  if (/^doc_\d+_wa\d+/i.test(n) || /_wa\d{4}/i.test(n)) {
    return "WhatsApp export";
  }
  const junkExt = [
    ".uvopt",
    ".uvproj",
    ".hex",
    ".lst",
    ".obj",
    ".m51",
    ".lnp",
  ];
  for (const e of junkExt) {
    if (n.endsWith(e)) return `build artifact (${e})`;
  }
  if (n.includes(".uvgui")) return "Keil uvgui";
  if (n.endsWith(".build_log.htm") || n.endsWith(".build_log.html")) {
    return "build log";
  }
  // Bare Keil project dumps without extension (rare as files)
  if (!n.includes(".") && /^(exp\d+|neel|startup)$/i.test(name)) {
    return "bare build output name";
  }
  return null;
}

function looksConventionOk(base, ctx) {
  const { category, subject, semNum } = ctx;
  if (!category) {
    // Syllabus at sem root
    return /^Sem_\d+_Syllabus$/i.test(base);
  }
  if (category === "Notes") {
    return (
      new RegExp(
        `^${escapeRe(subject)}_Unit_(\\d+|[IVX]+)(_Notes)?(_[A-Za-z0-9_]+)?$`,
        "i",
      ).test(base) ||
      new RegExp(`^${escapeRe(subject)}_[A-Za-z0-9_]+$`, "i").test(base)
    );
  }
  if (category === "PPT") {
    return (
      new RegExp(
        `^${escapeRe(subject)}_Unit_(\\d+|[IVX]+)(_[A-Za-z0-9_]+)?$`,
        "i",
      ).test(base) ||
      new RegExp(`^${escapeRe(subject)}_[A-Za-z0-9_]+$`, "i").test(base)
    );
  }
  if (category === "WriteUps") {
    return new RegExp(
      `^Sem_${semNum}_[A-Za-z0-9_]+_WriteUp_(\\d+|[A-Za-z]+)(_[A-Za-z0-9_]+)?$`,
      "i",
    ).test(base);
  }
  if (category === "PYQ") {
    return new RegExp(
      `^${escapeRe(subject)}_PYQ_\\d{4}(_(Mid|End))?(_\\d+)?$`,
      "i",
    ).test(base);
  }
  if (category === "QB") {
    return new RegExp(
      `^${escapeRe(subject)}_QB(_\\d{4})?(_\\d+)?(_Solved)?$`,
      "i",
    ).test(base);
  }
  return false;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function proposeMechanicalRename(name, mimeType, ctx) {
  const { category, subject, semNum, yearHint } = ctx;
  let { base, ext } = splitName(name);

  // Restore missing extension from mime
  if (!ext && mimeType && MIME_EXT[mimeType]) {
    ext = MIME_EXT[mimeType];
  }

  const before = `${base}${ext}`;
  base = sanitizeBase(base);

  // Fix Notes: subject prefix + Unit_N → Unit_N_Notes when under Notes
  if (category === "Notes" && subject) {
    const subjRe = new RegExp(`^${escapeRe(subject)}_`, "i");
    if (subjRe.test(base)) {
      base = base.replace(subjRe, `${subject}_`);
    } else if (/^Unit_(\d+|[IVX]+)/i.test(base) || !/^Sem_/i.test(base)) {
      // Topic / Unit-only under subject folder → prefix subject
      base = `${subject}_${base}`;
    }
    const unitOnly = new RegExp(
      `^${escapeRe(subject)}_Unit_(\\d+|[IVX]+)$`,
      "i",
    );
    if (unitOnly.test(base)) {
      base = base.replace(unitOnly, `${subject}_Unit_$1_Notes`);
    }
    // Unit_N_Topic without _Notes is fine for topic files; Unit_N alone got Notes above
  }

  // PPT: ensure subject prefix + Unit casing
  if (category === "PPT" && subject) {
    // DBMS_PPT_Unit_1 → DBMS_Unit_1 (must run before generic _PPT_)
    base = base.replace(
      new RegExp(`^${escapeRe(subject)}_PPT_Unit_`, "i"),
      `${subject}_Unit_`,
    );
    // DBMS_PPT_1 → DBMS_Unit_1
    base = base.replace(
      new RegExp(`^${escapeRe(subject)}_PPT_`, "i"),
      `${subject}_Unit_`,
    );
    base = base.replace(/_PART_/gi, "_Part_");
    base = base.replace(/_Unit_Unit_/gi, "_Unit_");
    const subjRe = new RegExp(`^${escapeRe(subject)}_`, "i");
    if (subjRe.test(base)) {
      base = base.replace(subjRe, `${subject}_`);
    } else if (/^Unit_\d+/i.test(base)) {
      base = `${subject}_${base}`;
    } else if (!/^Sem_/i.test(base)) {
      // Topic-only under subject folder → prefix subject
      base = `${subject}_${base}`;
    }
    base = base.replace(/_Unit_Unit_/gi, "_Unit_");
  }

  // WriteUps: Sem_N_Code_WriteUp_K_Topic
  if (category === "WriteUps" && semNum) {
    base = base.replace(/WriteUp_+/g, "WriteUp_");
    // EXP_1_Topic / Exp1_Topic → Sem_N_Lab_WriteUp_1_Topic
    const exp = base.match(/^EXP_?(\d+)_(.+)$/i);
    if (exp && subject && !/^Sem_\d+_/.test(base)) {
      const lab = subject.replace(/-/g, "_");
      base = `Sem_${semNum}_${lab}_WriteUp_${exp[1]}_${exp[2]}`;
    }
    // Ensure Sem_N_ prefix when missing but looks like lab writeup
    if (!/^Sem_\d+_/i.test(base) && /WriteUp_\d+/i.test(base) && subject) {
      const lab = subject.replace(/-/g, "_");
      base = `Sem_${semNum}_${lab}_${base}`.replace(/WriteUp_WriteUp_/i, "WriteUp_");
      // If base already had subject codes, avoid double — prefer existing Sem pattern from sanitize
    }
    // Normalize Sem_4_PBL_II_WriteUp_1
    base = base.replace(
      new RegExp(`^Sem_${semNum}_PBL_II_WriteUp_`, "i"),
      `Sem_${semNum}_PBL_II_WriteUp_`,
    );
  }

  // PYQ under year folder: Subject_PYQ_Year...
  if (category === "PYQ" && subject) {
    const pyqNum = base.match(/^PYQ_?(\d+)$/i);
    if (pyqNum && yearHint) {
      base = `${subject}_PYQ_${yearHint}_${pyqNum[1]}`;
    } else if (/^PYQ\d+$/i.test(base) || /^PYQ_\d+$/i.test(base)) {
      return {
        proposed: `${base}${ext}`,
        changed: `${base}${ext}` !== name,
        needsReview: true,
        reviewReason: "Generic PYQ# name; needs year/type mapping",
      };
    } else if (!new RegExp(`^${escapeRe(subject)}_PYQ_`, "i").test(base)) {
      if (/^\d{5}$/.test(base) || /^[a-z]+paper$/i.test(base)) {
        return {
          proposed: `${base}${ext}`,
          changed: `${base}${ext}` !== name,
          needsReview: true,
          reviewReason: "Opaque PYQ filename",
        };
      }
    } else {
      const subjRe = new RegExp(`^${escapeRe(subject)}_`, "i");
      if (subjRe.test(base)) base = base.replace(subjRe, `${subject}_`);
    }
  }

  // QB: QB1 / QB1_Solved → Subject_QB_1 / Subject_QB_1_Solved
  if (category === "QB" && subject) {
    const qbSolved = base.match(/^QB_?(\d+)_Solved$/i);
    const qbPlain = base.match(/^QB_?(\d+)$/i);
    if (qbSolved) {
      base = `${subject}_QB_${qbSolved[1]}_Solved`;
    } else if (qbPlain) {
      base = `${subject}_QB_${qbPlain[1]}`;
    } else {
      const subjRe = new RegExp(`^${escapeRe(subject)}_`, "i");
      if (subjRe.test(base)) {
        base = base.replace(subjRe, `${subject}_`);
      } else if (/^QB_/i.test(base) || /^QUESTION_BANK/i.test(base)) {
        base = `${subject}_${base}`;
      }
    }
  }

  const proposed = `${base}${ext}`;
  const changed = proposed !== name;

  const opaque =
    /^\d{4,}$/.test(base.replace(new RegExp(`^${escapeRe(subject || "")}_`, "i"), "")) ||
    /^PYQ\d+$/i.test(base) ||
    /(^|_)(floyd|wakerly|neamen|kang|statistics|adobe_scan|skm_\d)(_|$)/i.test(
      base,
    ) ||
    /text_book|reference_book|by_thomas|electronic_devices_\d/i.test(base);

  // After mechanical fix, still not convention-shaped?
  const ok = looksConventionOk(base, ctx);
  if (changed && ok && !opaque) {
    return { proposed, changed: true, needsReview: false };
  }
  if (!changed && ok && !opaque) {
    return { proposed: name, changed: false, needsReview: false };
  }
  if (changed) {
    return {
      proposed,
      changed: true,
      needsReview: !ok || opaque,
      reviewReason: opaque
        ? "Mechanically cleaned but still needs semantic naming"
        : !ok
          ? "Mechanically cleaned but still needs semantic naming"
          : undefined,
    };
  }
  return {
    proposed: name,
    changed: false,
    needsReview: true,
    reviewReason: "Does not match convention; needs semantic rename",
  };
}

async function listChildren(folderId) {
  const out = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, md5Checksum, size)",
      pageSize: 100,
      pageToken,
      orderBy: "folder,name",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    out.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

async function ensureJunkFolder() {
  const kids = await listChildren(rootId);
  const existing = kids.find(
    (f) =>
      f.mimeType === FOLDER_MIME &&
      (f.name === "_Junk" || f.name === "_JUNK"),
  );
  if (existing) return existing.id;
  if (dryRun) return null;
  const created = await drive.files.create({
    requestBody: {
      name: "_Junk",
      mimeType: FOLDER_MIME,
      parents: [rootId],
    },
    fields: "id, name",
    supportsAllDrives: true,
  });
  console.log(`  📁 Created junk folder: _Junk (${created.data.id})`);
  return created.data.id;
}

async function trashFile(fileId, label, junkFolderId) {
  if (dryRun) {
    console.log(`  [trash] ${label}`);
    return { ok: true, method: "dry-run" };
  }
  try {
    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
    console.log(`  🗑️  Trashed: ${label}`);
    return { ok: true, method: "trash" };
  } catch (err) {
    const status = err?.status || err?.code;
    if (status === 403 && junkFolderId) {
      try {
        // Move into _Junk (remove from current parents via add+remove)
        const meta = await drive.files.get({
          fileId,
          fields: "parents",
          supportsAllDrives: true,
        });
        const prev = (meta.data.parents || []).join(",");
        await drive.files.update({
          fileId,
          addParents: junkFolderId,
          removeParents: prev,
          supportsAllDrives: true,
          fields: "id, parents",
        });
        console.log(`  📦 Moved to _Junk (trash denied): ${label}`);
        return { ok: true, method: "move-_Junk" };
      } catch (err2) {
        console.error(`  ❌ Failed to quarantine ${label}:`, err2.message || err2);
        return { ok: false, error: String(err2.message || err2) };
      }
    }
    console.error(`  ❌ Failed to trash ${label}:`, err.message || err);
    return { ok: false, error: String(err.message || err) };
  }
}

async function renameFile(fileId, newName, label) {
  if (dryRun) {
    console.log(`  [rename] ${label} → ${newName}`);
    return { ok: true };
  }
  try {
    await drive.files.update({
      fileId,
      requestBody: { name: newName },
      supportsAllDrives: true,
    });
    console.log(`  ✅ Renamed: ${label} → ${newName}`);
    return { ok: true };
  } catch (err) {
    console.error(`  ❌ Failed to rename ${label}:`, err.message || err);
    return { ok: false, error: String(err.message || err) };
  }
}

/**
 * Walk: branch / Sem_N_BRANCH / category / subject [/ year] / file
 */
async function walk() {
  const results = [];
  const branches = (await listChildren(rootId)).filter(
    (f) => f.mimeType === FOLDER_MIME,
  );

  for (const branch of branches) {
    const branchName = branch.name.toUpperCase();
    if (branchFilter && branchName !== branchFilter) continue;
    console.log(`\n📁 ${branch.name}`);

    const semFolders = (await listChildren(branch.id)).filter(
      (f) => f.mimeType === FOLDER_MIME,
    );

    for (const sem of semFolders) {
      const semMatch = sem.name.match(SEM_RE);
      if (!semMatch) {
        console.log(`  ⚠️  Skipping non-semester folder: ${sem.name}`);
        continue;
      }
      const semNum = semMatch[1];
      console.log(`  📁 ${sem.name}`);

      const children = await listChildren(sem.id);
      for (const child of children) {
        if (child.mimeType !== FOLDER_MIME) {
          // Syllabus or loose file at sem root
          await classifyAndQueue(results, child, {
            path: `${branch.name}/${sem.name}/${child.name}`,
            branch: branchName,
            semNum,
            category: null,
            subject: null,
            yearHint: null,
          });
          continue;
        }

        const catMatch = child.name.match(CAT_RE);
        const category = catMatch ? catMatch[2] : null;
        if (!category) {
          console.log(`    ⚠️  Unknown category folder: ${child.name}`);
          // Still scan files inside for junk
          await walkUnknownFolder(results, child, {
            pathPrefix: `${branch.name}/${sem.name}/${child.name}`,
            branch: branchName,
            semNum,
          });
          continue;
        }

        const subjects = await listChildren(child.id);
        for (const subj of subjects) {
          if (subj.mimeType !== FOLDER_MIME) {
            await classifyAndQueue(results, subj, {
              path: `${branch.name}/${sem.name}/${child.name}/${subj.name}`,
              branch: branchName,
              semNum,
              category,
              subject: "General",
              yearHint: null,
            });
            continue;
          }

          const subjectName = subj.name;
          await walkSubjectFolder(results, subj, {
            pathPrefix: `${branch.name}/${sem.name}/${child.name}/${subjectName}`,
            branch: branchName,
            semNum,
            category,
            subject: subjectName,
          });
        }
      }
    }
  }

  return results;
}

async function walkSubjectFolder(results, folder, ctx) {
  const items = await listChildren(folder.id);
  for (const item of items) {
    if (item.mimeType === FOLDER_MIME) {
      // Year folder under PYQ/QB
      const yearHint = /^\d{4}$/.test(item.name) ? item.name : null;
      const nested = await listChildren(item.id);
      for (const f of nested) {
        if (f.mimeType === FOLDER_MIME) {
          // Deeper nesting (e.g. QB/Questions) — walk one more level
          const deeper = await listChildren(f.id);
          for (const df of deeper) {
            if (df.mimeType === FOLDER_MIME) continue;
            await classifyAndQueue(results, df, {
              path: `${ctx.pathPrefix}/${item.name}/${f.name}/${df.name}`,
              branch: ctx.branch,
              semNum: ctx.semNum,
              category: ctx.category,
              subject: ctx.subject,
              yearHint,
            });
          }
        } else {
          await classifyAndQueue(results, f, {
            path: `${ctx.pathPrefix}/${item.name}/${f.name}`,
            branch: ctx.branch,
            semNum: ctx.semNum,
            category: ctx.category,
            subject: ctx.subject,
            yearHint,
          });
        }
      }
    } else {
      await classifyAndQueue(results, item, {
        path: `${ctx.pathPrefix}/${item.name}`,
        branch: ctx.branch,
        semNum: ctx.semNum,
        category: ctx.category,
        subject: ctx.subject,
        yearHint: null,
      });
    }
  }
}

async function walkUnknownFolder(results, folder, ctx) {
  const items = await listChildren(folder.id);
  for (const item of items) {
    if (item.mimeType === FOLDER_MIME) {
      await walkUnknownFolder(results, item, {
        ...ctx,
        pathPrefix: `${ctx.pathPrefix}/${item.name}`,
      });
    } else {
      await classifyAndQueue(results, item, {
        path: `${ctx.pathPrefix}/${item.name}`,
        branch: ctx.branch,
        semNum: ctx.semNum,
        category: null,
        subject: null,
        yearHint: null,
      });
    }
  }
}

async function classifyAndQueue(results, file, ctx) {
  const junkReason = isJunk(file.name, file.mimeType);
  if (junkReason) {
    results.push({
      status: "trash",
      id: file.id,
      path: ctx.path,
      name: file.name,
      reason: junkReason,
    });
    return;
  }

  if (trashOnly) {
    results.push({
      status: "ok",
      id: file.id,
      path: ctx.path,
      name: file.name,
    });
    return;
  }

  const proposal = proposeMechanicalRename(file.name, file.mimeType, ctx);

  if (proposal.needsReview && !proposal.changed) {
    results.push({
      status: "needs_review",
      id: file.id,
      path: ctx.path,
      name: file.name,
      reason: proposal.reviewReason || "needs semantic rename",
      category: ctx.category,
      subject: ctx.subject,
      semNum: ctx.semNum,
    });
    return;
  }

  if (proposal.changed) {
    results.push({
      status: proposal.needsReview ? "rename_and_review" : "rename",
      id: file.id,
      path: ctx.path,
      name: file.name,
      proposed: proposal.proposed,
      reason: proposal.reviewReason,
      category: ctx.category,
      subject: ctx.subject,
      semNum: ctx.semNum,
    });
    return;
  }

  results.push({
    status: "ok",
    id: file.id,
    path: ctx.path,
    name: file.name,
  });
}

async function main() {
  if (!rootId) {
    console.error("Missing GOOGLE_DRIVE_FOLDER_ID");
    process.exit(1);
  }

  console.log(
    `\n🔧 Drive file rename audit${dryRun ? " (dry-run)" : " (APPLY)"}` +
      `${trashOnly ? " [trash-only]" : ""}` +
      `${branchFilter ? ` [branch=${branchFilter}]` : ""}\n`,
  );

  const results = await walk();

  const counts = {
    ok: 0,
    rename: 0,
    rename_and_review: 0,
    trash: 0,
    needs_review: 0,
  };
  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  console.log("\n── Summary ──");
  console.log(`  ok:                ${counts.ok || 0}`);
  console.log(`  rename:            ${counts.rename || 0}`);
  console.log(`  rename+review:     ${counts.rename_and_review || 0}`);
  console.log(`  trash:             ${counts.trash || 0}`);
  console.log(`  needs_review:      ${counts.needs_review || 0}`);
  console.log(`  total:             ${results.length}`);

  const reviewItems = results.filter(
    (r) => r.status === "needs_review" || r.status === "rename_and_review",
  );
  if (reviewItems.length) {
    console.log("\n── Needs review (sample up to 40) ──");
    for (const r of reviewItems.slice(0, 40)) {
      console.log(
        `  ? ${r.path}${r.proposed ? ` → ${r.proposed}` : ""} (${r.reason || ""})`,
      );
    }
    if (reviewItems.length > 40) {
      console.log(`  … +${reviewItems.length - 40} more (see ${reportPath})`);
    }
  }

  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun,
        trashOnly,
        branchFilter,
        counts,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\n📝 Wrote report: ${reportPath}`);

  // Apply actions
  const toTrash = results.filter((r) => r.status === "trash");
  const toRename = results.filter(
    (r) => r.status === "rename" || r.status === "rename_and_review",
  );

  if (!dryRun) {
    console.log("\n── Applying ──");
    const junkFolderId = toTrash.length ? await ensureJunkFolder() : null;
    let trashOk = 0;
    let renameOk = 0;
    for (const r of toTrash) {
      const res = await trashFile(r.id, `${r.path} [${r.reason}]`, junkFolderId);
      if (res.ok) trashOk++;
    }
    if (!trashOnly) {
      for (const r of toRename) {
        if (r.proposed && r.proposed !== r.name) {
          const res = await renameFile(r.id, r.proposed, r.path);
          if (res.ok) renameOk++;
        }
      }
    }
    console.log(
      `\n✨ Apply complete. Trashed/quarantined ${trashOk}/${toTrash.length}, renamed ${renameOk}/${toRename.length}.`,
    );
  } else {
    console.log(
      `\nDry-run only. Re-run with --apply to trash ${toTrash.length} and rename ${toRename.length} files.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
