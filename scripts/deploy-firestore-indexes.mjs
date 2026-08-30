/**
 * Deploy Firestore indexes (vector + composite) using FIREBASE_PROJECT_ID from env.
 * Requires: firebase login (once) — https://firebase.google.com/docs/cli
 *
 * Usage: npm run deploy:indexes
 */

import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error(
    "❌ Set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local",
  );
  process.exit(1);
}

console.log(`\n🚀 Deploying Firestore indexes to project: ${projectId}\n`);
console.log(
  "   (You must run `firebase login` once if not already authenticated.)\n",
);

const result = spawnSync(
  "npx",
  [
    "firebase-tools",
    "deploy",
    "--only",
    "firestore:indexes",
    "--project",
    projectId,
  ],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
