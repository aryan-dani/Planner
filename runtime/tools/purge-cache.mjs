/**
 * runtime/tools/purge-cache.mjs
 * Deletes semantic_cache entries past expires_at, or created_at older than 14 days.
 */

import { db } from "../lib/firebase.mjs";

const BATCH_LIMIT = 500;
const FALLBACK_MAX_AGE_DAYS = 14;

export default async function purgeCache() {
  console.log(`\n🧹 Starting Semantic Cache Cleanup…\n`);

  try {
    const nowIso = new Date().toISOString();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - FALLBACK_MAX_AGE_DAYS);
    const cutoffStr = cutoff.toISOString();

    console.log(`🔍 Looking for cache entries with expires_at < ${nowIso}`);
    console.log(`   (fallback: created_at < ${cutoffStr})`);

    const expiredByExpires = await db
      .collection("semantic_cache")
      .where("expires_at", "<", nowIso)
      .get();

    const expiredByCreated = await db
      .collection("semantic_cache")
      .where("created_at", "<", cutoffStr)
      .get();

    const toDelete = new Map();
    for (const doc of expiredByExpires.docs) toDelete.set(doc.id, doc.ref);
    for (const doc of expiredByCreated.docs) toDelete.set(doc.id, doc.ref);

    if (toDelete.size === 0) {
      console.log(`✅ No expired cache entries found.`);
      return;
    }

    console.log(`🗑️ Found ${toDelete.size} expired cache entries. Deleting...`);

    const refs = [...toDelete.values()];
    let deleted = 0;
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = refs.slice(i, i + BATCH_LIMIT);
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
      deleted += chunk.length;
      console.log(`  ✅ Deleted ${deleted}/${refs.length}`);
    }

    console.log(`✅ Successfully deleted ${deleted} expired cache entries.\n`);
  } catch (error) {
    console.error(`❌ Cache cleanup failed: ${error.message}`);
  }
}

// Allow running directly
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  purgeCache();
}
