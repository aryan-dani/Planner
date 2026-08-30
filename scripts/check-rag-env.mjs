/**
 * Check which RAG / AI env vars are configured (values never printed).
 * Usage: npm run check-rag-env
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const checks = [
  { key: "GROQ_API_KEY", required: true, note: "Chat / study / summarize (unchanged)" },
  { key: "GEMINI_API_KEY", required: false, note: "Embeddings for hybrid search (optional but recommended)" },
  { key: "FIREBASE_PROJECT_ID", required: true, note: "Firestore + index deploy" },
  { key: "FIREBASE_CLIENT_EMAIL", required: true, note: "Admin SDK for sync/index" },
  { key: "FIREBASE_PRIVATE_KEY", required: true, note: "Admin SDK for sync/index" },
  { key: "GOOGLE_DRIVE_FOLDER_ID", required: true, note: "Drive sync source" },
];

console.log("\n🔎 RAG environment check\n");

let ok = true;
for (const { key, required, note } of checks) {
  const val = process.env[key];
  const set = Boolean(val && val.length > 3 && !val.includes("YOUR_"));
  const icon = set ? "✅" : required ? "❌" : "⚠️ ";
  if (required && !set) ok = false;
  console.log(`${icon} ${key}${set ? "" : " (missing)"} — ${note}`);
}

console.log("\nNext steps:");
console.log("  1. Add missing keys to .env.local, Vercel, and GitHub Actions secrets");
console.log("  2. npm run deploy:indexes   (after firebase login)");
console.log("  3. npm run index-content    (or trigger storage-sync workflow)");
console.log("  4. npm run eval-rag         (measure recall after indexing)\n");

process.exit(ok ? 0 : 1);
