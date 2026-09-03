/**
 * runtime/tools/doctor.mjs
 * Environment + Firestore health check for Academic OS runtime.
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

const ENV_CHECKS = [
  { key: "GROQ_API_KEY", required: true, note: "Chat / study / summarize" },
  {
    key: "GEMINI_API_KEY",
    required: false,
    note: "Embeddings for hybrid search",
  },
  { key: "FIREBASE_PROJECT_ID", required: true, note: "Firestore project" },
  {
    key: "FIREBASE_CLIENT_EMAIL",
    required: true,
    note: "Admin SDK for sync/index",
  },
  {
    key: "FIREBASE_PRIVATE_KEY",
    required: true,
    note: "Admin SDK for sync/index",
  },
  {
    key: "GOOGLE_DRIVE_FOLDER_ID",
    required: true,
    note: "Drive sync source",
  },
  {
    key: "UPSTASH_REDIS_REST_URL",
    required: false,
    note: "Distributed rate limits (optional)",
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    required: false,
    note: "Distributed rate limits (optional)",
  },
];

export default async function doctor() {
  loadEnvLocal();

  console.log("\n🩺 Academic OS doctor\n");
  console.log("Environment");

  let ok = true;
  for (const { key, required, note } of ENV_CHECKS) {
    const val = process.env[key];
    const set = Boolean(val && val.length > 3 && !val.includes("YOUR_"));
    const icon = set ? "✅" : required ? "❌" : "⚠️ ";
    if (required && !set) ok = false;
    console.log(`  ${icon} ${key}${set ? "" : " (missing)"} — ${note}`);
  }

  console.log("\nFirestore");
  try {
    const { db } = await import("../lib/firebase.mjs");
    const [subjects, resources, chunks] = await Promise.all([
      db.collection("subjects").count().get(),
      db.collection("resources").count().get(),
      db.collection("resource_chunks").count().get(),
    ]);
    console.log(`  ✅ subjects: ${subjects.data().count}`);
    console.log(`  ✅ resources: ${resources.data().count}`);
    console.log(`  ✅ resource_chunks: ${chunks.data().count}`);
    if (chunks.data().count === 0) {
      console.log("  ⚠️  No RAG chunks — run: node runtime/index.mjs index");
    }
  } catch (err) {
    ok = false;
    console.log(`  ❌ Firestore unreachable: ${err.message}`);
  }

  console.log("\nNext steps:");
  console.log("  1. Fill missing keys in .env.local / Vercel / Actions");
  console.log("  2. node runtime/index.mjs sync [--subject=ML] [--dry-run]");
  console.log("  3. node runtime/index.mjs index");
  console.log("  4. Deploy firestore.rules if not yet live\n");

  if (!ok) {
    throw new Error("Doctor found required configuration issues");
  }
}
