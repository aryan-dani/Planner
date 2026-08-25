/**
 * runtime/tools/purge-cache.mjs
 * Deletes semantic_cache entries older than 30 days.
 */

import { db } from "../lib/firebase.mjs";

const BATCH_LIMIT = 500;

export default async function purgeCache() {
  console.log(`\n🧹 Starting Semantic Cache Cleanup…\n`);

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString();

    console.log(`🔍 Looking for cache entries older than: ${cutoffStr}`);

    const snapshot = await db.collection("semantic_cache")
      .where("created_at", "<", cutoffStr)
      .get();

    if (snapshot.empty) {
      console.log(`✅ No expired cache entries found.`);
      return;
    }

    console.log(`🗑️ Found ${snapshot.size} expired cache entries. Deleting...`);

    let deleted = 0;
    for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = snapshot.docs.slice(i, i + BATCH_LIMIT);
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += chunk.length;
      console.log(`  ✅ Deleted ${deleted}/${snapshot.size}`);
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
