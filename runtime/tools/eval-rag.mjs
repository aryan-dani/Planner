/**
 * RAG evaluation harness — reports recall@5, MRR@10, context size, latency.
 * Uses resource_chunks when available, falls back to resource_content.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "../lib/firebase.mjs";
import { tokenize } from "../lib/rag/tokenize.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUESTIONS_PATH = join(__dirname, "../eval/questions.json");
const REPORT_DIR = join(process.cwd(), "runtime", "eval", "reports");

function cleanQuery(q) {
  return q
    .toLowerCase()
    .replace(/^(what are|what is|tell me about|explain)\s+/i, "")
    .trim();
}

async function searchChunks(query, branch, semester, limit = 10) {
  const terms = tokenize(cleanQuery(query)).slice(0, 10);
  if (terms.length === 0) return [];

  let ref = db.collection("resource_chunks");
  if (branch) ref = ref.where("branch", "==", branch);
  if (semester != null) ref = ref.where("semester", "==", semester);
  ref = ref.where("chunk_tokens", "array-contains-any", terms);

  const snap = await ref.limit(80).get();
  const hits = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    let score = 0;
    const text = (d.text || "").toLowerCase();
    const title = (d.title || "").toLowerCase();
    const subject = (d.subject_name || "").toLowerCase();
    for (const term of terms) {
      if (title.includes(term)) score += 10;
      if (subject.includes(term)) score += 5;
      if (text.includes(term)) score += 2;
    }
    if (score > 0) {
      hits.push({
        resource_id: d.resource_id,
        subject_name: d.subject_name,
        section_label: d.section_label,
        title: d.title,
        score,
        text_len: (d.text || "").length,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

async function searchLegacy(query, limit = 10) {
  const terms = tokenize(cleanQuery(query)).slice(0, 10);
  if (terms.length === 0) return [];

  const snap = await db
    .collection("resource_content")
    .where("search_tokens", "array-contains-any", terms)
    .limit(80)
    .get();

  const hits = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    let score = 0;
    for (const term of terms) {
      if ((d.title || "").toLowerCase().includes(term)) score += 10;
      if ((d.subject_name || "").toLowerCase().includes(term)) score += 5;
      if ((d.content || "").toLowerCase().includes(term)) score += 2;
    }
    if (score > 0) {
      hits.push({
        resource_id: d.resource_id,
        subject_name: d.subject_name,
        section_label: "Document",
        title: d.title,
        score,
        text_len: (d.snippet || "").length,
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

function hitMatchesQuestion(hit, q) {
  if (q.expected_resource_id && hit.resource_id === q.expected_resource_id) {
    return true;
  }
  if (q.expected_subject) {
    const subj = (hit.subject_name || "").toLowerCase();
    if (subj.includes(q.expected_subject.toLowerCase())) return true;
  }
  return false;
}

export default async function evalRag() {
  const questions = JSON.parse(readFileSync(QUESTIONS_PATH, "utf8"));
  const chunkCount = (await db.collection("resource_chunks").limit(1).get()).size;
  const useChunks = chunkCount > 0 || (await db.collection("resource_chunks").limit(1).get()).docs.length > 0;

  const hasChunksSnap = await db.collection("resource_chunks").limit(1).get();
  const mode = hasChunksSnap.empty ? "legacy" : "chunks";

  console.log(`\n📏 RAG Eval (${mode} mode) — ${questions.length} questions\n`);

  let recall5 = 0;
  let mrr10 = 0;
  let totalLatency = 0;
  let totalContext = 0;
  const details = [];

  for (const q of questions) {
    const start = Date.now();
    const hits =
      mode === "chunks"
        ? await searchChunks(q.query, q.branch, q.semester, 10)
        : await searchLegacy(q.query, 10);
    const latency = Date.now() - start;
    totalLatency += latency;
    totalContext += hits.slice(0, 5).reduce((s, h) => s + h.text_len, 0);

    const top5 = hits.slice(0, 5);
    const recalled = top5.some((h) => hitMatchesQuestion(h, q));
    if (recalled) recall5++;

    let rr = 0;
    for (let i = 0; i < hits.length; i++) {
      if (hitMatchesQuestion(hits[i], q)) {
        rr = 1 / (i + 1);
        break;
      }
    }
    mrr10 += rr;

    details.push({
      id: q.id,
      query: q.query,
      recalled,
      rr,
      latency_ms: latency,
      top_hit: hits[0] || null,
    });

    console.log(
      `${recalled ? "✅" : "❌"} ${q.id}: "${q.query}" (${latency}ms) → ${hits[0]?.title || "no hit"}`,
    );
  }

  const n = questions.length;
  const report = {
    mode,
    timestamp: new Date().toISOString(),
    questions: n,
    recall_at_5: recall5 / n,
    mrr_at_10: mrr10 / n,
    mean_latency_ms: totalLatency / n,
    mean_context_chars: totalContext / n,
    details,
  };

  mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = join(
    REPORT_DIR,
    `eval-${Date.now()}.json`,
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n--- Summary ---");
  console.log(`Recall@5:  ${(report.recall_at_5 * 100).toFixed(1)}%`);
  console.log(`MRR@10:    ${(report.mrr_at_10 * 100).toFixed(1)}%`);
  console.log(`Latency:   ${report.mean_latency_ms.toFixed(0)}ms avg`);
  console.log(`Context:   ${report.mean_context_chars.toFixed(0)} chars avg`);
  console.log(`Report:    ${reportPath}\n`);

  return report;
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  evalRag().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
