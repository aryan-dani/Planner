/**
 * Recursively upload a local folder into the configured Google Drive tree.
 * Prefer: npm run drive -- put <file|dir> --to=...
 *
 * Legacy usage:
 *   node runtime/tools/upload-drive.mjs <local_directory> [--overwrite] [--year=YYYY-YYYY] [--dry-run] [--no-sync]
 *
 * After upload, runs a path-scoped sync (not a full catalog rebuild).
 */
import { existsSync, statSync } from "fs";
import { basename } from "path";
import syncDrive from "./sync-drive.mjs";
import drivePut from "./drive-put.mjs";
import { getEnv } from "../lib/env.mjs";
import {
  ACADEMIC_YEAR_PATH_RE,
  DEFAULT_ACADEMIC_YEAR,
} from "../lib/academicYear.mjs";

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

async function main() {
  if (!getEnv("GOOGLE_DRIVE_FOLDER_ID")) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in .env.local");
  }

  const opts = parseArgs(process.argv);
  const { localTarget } = opts;

  if (!localTarget || !existsSync(localTarget)) {
    console.error("Please specify a valid local path to upload.");
    console.log(
      "Usage: node runtime/tools/upload-drive.mjs <local_directory|file> [--overwrite] [--year=YYYY-YYYY] [--dry-run] [--no-sync]",
    );
    console.log(
      "Prefer: npm run drive -- put <file> --year= --branch= --semester= --subject=",
    );
    process.exit(1);
  }

  const isDir = statSync(localTarget).isDirectory();
  const yearHint = opts.year || DEFAULT_ACADEMIC_YEAR;
  const base = basename(localTarget);

  // Map legacy directory uploads onto drive put --to
  let to = null;
  if (ACADEMIC_YEAR_PATH_RE.test(base)) {
    to = base;
  } else if (/Sem_\d+_/i.test(base)) {
    const branch = base.match(/Sem_\d+_(.+)/i)?.[1]?.toUpperCase();
    to = `${yearHint}/${branch}/${base}`;
  } else if (isDir) {
    to = yearHint;
  }

  const putArgs = [localTarget];
  if (to) putArgs.push(`--to=${to}`);
  if (opts.overwrite || !isDir) putArgs.push("--overwrite");
  else putArgs.push("--no-overwrite");
  if (opts.dryRun) putArgs.push("--dry-run");
  if (opts.noSync) putArgs.push("--no-sync");

  // For directory uploads that mirror the Drive tree, put upserts each file.
  // Also run a scoped sync afterward so deletes in that subtree are pruned.
  const result = await drivePut(putArgs);

  if (!opts.dryRun && !opts.noSync && to && isDir) {
    console.log(`\n🔁 Path-scoped sync for ${to}…`);
    await syncDrive({ path: to, dryRun: false });
  }

  return result;
}

main().catch((err) => {
  console.error(`\nUpload failed: ${err.message}`);
  process.exit(1);
});
