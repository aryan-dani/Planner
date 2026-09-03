/**
 * runtime/tools/index-content.mjs
 * Indexes resources into resource_content (legacy) + resource_chunks (hybrid RAG).
 */

import crypto from "crypto";
import { select, upsert, upsertBatch, remove } from "../lib/db.mjs";
import { downloadFile } from "../lib/storage.mjs";
import { extractStructured } from "../lib/extractor.mjs";
import { getDrive } from "../lib/drive.mjs";
import { chunkUnits, buildDocFreq, capDocFreq } from "../lib/chunker.mjs";
import { embedChunks } from "../lib/embed.mjs";
import { MAX_DOC_FREQ_TERMS } from "../lib/rag/config.mjs";
import { db } from "../lib/firebase.mjs";
import { FieldValue } from "firebase-admin/firestore";

const SUPPORTED_EXTS = [".pdf", ".docx", ".pptx", ".xlsx"];
const PAGE_SIZE = 500;
const RESOURCE_CONCURRENCY = 2;

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getExt(resource) {
  const title = (resource.title || "").toLowerCase();
  const url = (resource.file_url || "").toLowerCase().split("?")[0];
  for (const ext of SUPPORTED_EXTS) {
    if (title.endsWith(ext.slice(1)) || url.endsWith(ext)) {
      return ext.slice(1);
    }
  }
  return (title.split(".").pop() || "").toLowerCase();
}

async function fetchAll(table, columns = "*") {
  const all = [];
  let offset = 0;
  while (true) {
    const { data } = await select(table, { columns, limit: PAGE_SIZE, offset });
    if (!data.length) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function downloadResourceBuffer(res) {
  if (res.file_url.includes("drive.google.com")) {
    const fileIdMatch = res.file_url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (!fileIdMatch) throw new Error("Could not extract Google Drive file ID");
    const drive = getDrive();
    const driveRes = await drive.files.get(
      { fileId: fileIdMatch[1], alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(driveRes.data);
  }

  const url = new URL(res.file_url);
  const pathParts = decodeURIComponent(url.pathname).split("/course-content/");
  if (pathParts.length < 2) throw new Error("Invalid storage URL");
  return downloadFile("course-content", pathParts[1]);
}

async function deleteStaleChunks(resourceId, keepCount) {
  const { data } = await select("resource_chunks", {
    columns: "id,chunk_index",
    where: [{ column: "resource_id", op: "eq", value: resourceId }],
    limit: 5000,
  });
  const stale = data.filter((d) => (d.chunk_index ?? 0) >= keepCount);
  for (let i = 0; i < stale.length; i += 30) {
    const batch = stale.slice(i, i + 30);
    if (batch.length === 0) continue;
    await remove("resource_chunks", [
      { column: "id", op: "in", value: batch.map((s) => s.id) },
    ]);
  }
}

export default async function indexContent() {
  console.log("\n🔍 Starting Hybrid Content Indexing…\n");

  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  if (!hasGemini) {
    console.warn(
      "⚠️  GEMINI_API_KEY not set — embeddings skipped (lexical/BM25 search only).\n",
    );
  }

  const stats = { ok: 0, skipped: 0, failed: 0, chunksWritten: 0 };

  try {
    const resources = await fetchAll("resources");
    const indexable = resources.filter((r) => {
      const ext = getExt(r);
      return SUPPORTED_EXTS.some((e) => e === `.${ext}`);
    });

    console.log(`📦 ${indexable.length} indexable resources.\n`);

    const subjects = await fetchAll("subjects");
    const subjectsMap = new Map(subjects.map((s) => [s.id, s]));

    const indexedContent = await fetchAll("resource_content", "resource_id, last_indexed, search_tokens, content_hash");
    const indexedMap = new Map(indexedContent.map((i) => [i.resource_id, i]));

    const existingChunks = await fetchAll("resource_chunks", "resource_id, content_hash, chunk_index");
    const chunkHashMap = new Map();
    for (const c of existingChunks) {
      if (!chunkHashMap.has(c.resource_id)) chunkHashMap.set(c.resource_id, new Set());
      chunkHashMap.get(c.resource_id).add(c.content_hash);
    }

    const toIndex = [];
    const queued = new Set();
    const queue = (res) => {
      if (queued.has(res.id)) return;
      queued.add(res.id);
      toIndex.push(res);
    };

    for (const res of indexable) {
      const doc = indexedMap.get(res.id);
      if (!doc) {
        queue(res);
        continue;
      }
      if (!doc.search_tokens?.length) {
        queue(res);
        continue;
      }
      // Missing hash on the resource means sync cleared it after a Drive edit.
      if (!res.content_hash) {
        queue(res);
        continue;
      }
      // Hash mismatch between catalog and indexed content → reindex.
      if (doc.content_hash && res.content_hash !== doc.content_hash) {
        queue(res);
        continue;
      }
      // Drive mtime newer than last index → reindex even if hashes still match.
      const driveMtime = res.drive_modified_at || res.created_at;
      if (
        driveMtime &&
        doc.last_indexed &&
        new Date(driveMtime).getTime() > new Date(doc.last_indexed).getTime()
      ) {
        queue(res);
        continue;
      }
      // Same hash already indexed — skip.
      if (res.content_hash && doc.content_hash === res.content_hash) continue;
      queue(res);
    }

    console.log(`🚀 ${toIndex.length} resources to (re)index.\n`);

    const allChunkTokens = [];

    async function processResource(res, index) {
      try {
        console.log(`📄 [${index + 1}/${toIndex.length}] ${res.title}…`);
        const ext = getExt(res);
        const buffer = await downloadResourceBuffer(res);
        const contentHash = hashBuffer(buffer);

        const { units, pages, fullText } = await extractStructured(buffer, ext);
        if (!fullText?.trim() && units.length === 0) {
          console.warn(`   ⚠️  No text extracted, skipping.`);
          stats.skipped++;
          return;
        }

        const subject = subjectsMap.get(res.subject_id);
        const subjectName = subject?.name || "";
        const branch = subject?.branch || "";
        const semester = subject?.semester ?? null;
        const academicYear = subject?.academic_year || "2025-2026";

        const cleanText = (fullText || units.map((u) => u.text).join("\n\n"))
          .replace(/\u0000/g, "")
          .replace(/\\u0000/g, "")
          .replace(/\x00/g, "");

        // Legacy resource_content (summarize API)
        const legacyTokens = [...new Set(cleanText.toLowerCase().split(/\W+/).filter((w) => w.length >= 3))].slice(0, 5000);
        await upsert(
          "resource_content",
          {
            id: res.id,
            resource_id: res.id,
            content: cleanText.length > 800000 ? cleanText.substring(0, 800000) : cleanText,
            pages,
            last_indexed: new Date().toISOString(),
            title: res.title || "",
            subject_name: subjectName,
            file_url: res.file_url || "",
            snippet: cleanText.substring(0, 500),
            branch,
            semester,
            academic_year: academicYear,
            search_tokens: legacyTokens,
            content_hash: contentHash,
          },
          "resource_id",
        );

        // Chunk-level index
        const chunks = chunkUnits(units.length ? units : [{ text: cleanText, sectionLabel: "Document", sectionIndex: 1 }]);

        for (const chunk of chunks) {
          chunk.content_hash = crypto
            .createHash("sha256")
            .update(`${contentHash}:${chunk.chunk_index}:${chunk.text}`)
            .digest("hex");
          allChunkTokens.push(chunk);
        }

        const skipHashes = chunkHashMap.get(res.id) || new Set();
        if (hasGemini) {
          await embedChunks(chunks, skipHashes);
        }

        const chunkPayloads = chunks.map((chunk) => {
          const docId = `${res.id}_${chunk.chunk_index}`;
          const payload = {
            id: docId,
            resource_id: res.id,
            chunk_index: chunk.chunk_index,
            text: chunk.text,
            section_label: chunk.section_label,
            section_index: chunk.section_index,
            heading: chunk.heading || "",
            branch,
            semester,
            academic_year: academicYear,
            subject_id: res.subject_id || "",
            subject_name: subjectName,
            category: res.category || "other",
            title: res.title || "",
            file_url: res.file_url || "",
            chunk_tokens: chunk.chunk_tokens,
            token_count: chunk.token_count,
            content_hash: chunk.content_hash,
            last_indexed: new Date().toISOString(),
          };
          if (chunk.embedding?.length) {
            payload.embedding = FieldValue.vector(chunk.embedding);
          }
          return payload;
        });

        await upsertBatch("resource_chunks", chunkPayloads, {
          batchSize: 400,
          pauseMs: 500,
        });
        stats.chunksWritten += chunkPayloads.length;

        await deleteStaleChunks(res.id, chunks.length);

        await db.collection("resources").doc(res.id).set(
          {
            content_hash: contentHash,
            // Clear stale AI summary so summarize re-generates for new content.
            ai_summary: null,
          },
          { merge: true },
        );

        console.log(`   ✅ ${chunks.length} chunks, ${pages} pages`);
        stats.ok++;
      } catch (err) {
        console.error(`   ❌ ${res.title}: ${err.message}`);
        stats.failed++;
      }
    }

    const executing = new Set();
    for (let i = 0; i < toIndex.length; i++) {
      const p = processResource(toIndex[i], i);
      executing.add(p);
      p.finally(() => executing.delete(p));
      if (executing.size >= RESOURCE_CONCURRENCY) await Promise.race(executing);
    }
    await Promise.all(executing);

    // Corpus stats for BM25 IDF
    console.log("\n📊 Computing corpus statistics…");
    const allChunksForStats = await fetchAll("resource_chunks", "chunk_tokens, token_count");
    const df = buildDocFreq(allChunksForStats);
    const totalTokens = allChunksForStats.reduce((s, c) => s + (c.token_count || 0), 0);
    const avgTokenCount = allChunksForStats.length
      ? totalTokens / allChunksForStats.length
      : 0;

    await db.collection("rag_stats").doc("global").set({
      total_chunks: allChunksForStats.length,
      avg_token_count: avgTokenCount,
      doc_freq: capDocFreq(df, MAX_DOC_FREQ_TERMS),
      updated_at: new Date().toISOString(),
    });

    console.log(
      `\n✨ Indexing complete. ${allChunksForStats.length} total chunks in corpus.`,
    );
    console.log(
      `   Resources: ${stats.ok} indexed, ${stats.skipped} skipped (no text), ${stats.failed} failed.`,
    );
    console.log(`   Wrote ${stats.chunksWritten} chunk documents this run.\n`);
  } catch (error) {
    console.error(`\n❌ Indexing error: ${error.message}`);
    throw error;
  }
}
