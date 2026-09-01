import { matchesAcademicYear } from "@/lib/academic/scope";
import type { AcademicYear } from "@/lib/academic/scope";
import { LEGACY_ACADEMIC_YEAR } from "@/lib/academic/scope";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  BM25_CANDIDATE_LIMIT,
  CONTEXT_BUDGET_CHARS,
  CORPUS_STATS_CACHE_MS,
  MAX_CHUNKS_PER_RESOURCE,
  MAX_QUERY_TERMS,
  NEIGHBOR_EXPANSION_TOP,
  RRF_K,
  VECTOR_CANDIDATE_LIMIT,
} from "./config";
import { tokenize } from "./tokenize";
import { expandQueryTerms, detectCategoryBoost } from "./synonyms";
import {
  bm25Score,
  defaultCorpusStats,
  reciprocalRankFusion,
} from "./bm25";
import { embedQuery } from "./embed";
import type {
  ChunkRecord,
  CorpusStats,
  RetrievalResult,
  RetrievalSource,
  RetrieveParams,
} from "./types";
import { getRetrievalCache, setRetrievalCache } from "./cache";

let cachedStats: CorpusStats | null = null;
let statsLoadedAt = 0;

async function loadCorpusStats(): Promise<CorpusStats> {
  if (cachedStats && Date.now() - statsLoadedAt < CORPUS_STATS_CACHE_MS) {
    return cachedStats;
  }
  try {
    const snap = await adminDb().collection("rag_stats").doc("global").get();
    if (snap.exists) {
      cachedStats = snap.data() as CorpusStats;
      statsLoadedAt = Date.now();
      return cachedStats;
    }
  } catch (err) {
    console.warn("Corpus stats load failed:", err);
  }
  return defaultCorpusStats();
}

function cleanQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(what are|what is|tell me about|explain|do you have|can you|show me|tell me)\s+/i, "")
    .replace(/\s+(from|in|about)\s+(my|the)\s+(slides|notes|ppt|resources|material|coursework|studies)$/i, "")
    .replace(/^(context of|information on|details about)\s+/i, "")
    .trim();
}

async function lexicalCandidates(
  queryTerms: string[],
  academicYear?: string,
  branch?: string,
  semester?: number,
  resourceId?: string,
): Promise<ChunkRecord[]> {
  const db = adminDb();
  const terms = queryTerms.slice(0, MAX_QUERY_TERMS);
  if (terms.length === 0 && !resourceId) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ref: any = db.collection("resource_chunks");

  if (resourceId) {
    ref = ref.where("resource_id", "==", resourceId);
  } else {
    if (academicYear) ref = ref.where("academic_year", "==", academicYear);
    if (branch) ref = ref.where("branch", "==", branch);
    if (semester != null) ref = ref.where("semester", "==", semester);
    if (terms.length > 0) {
      ref = ref.where("chunk_tokens", "array-contains-any", terms.slice(0, 10));
    }
  }

  const snap = await ref.limit(BM25_CANDIDATE_LIMIT).get();
  return (
    snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as ChunkRecord[]
  ).filter((chunk: ChunkRecord) =>
    academicYear
      ? matchesAcademicYear(
          chunk.academic_year,
          academicYear as AcademicYear,
        )
      : true,
  );
}

async function vectorCandidates(
  queryVector: number[],
  academicYear?: string,
  branch?: string,
  semester?: number,
  resourceId?: string,
): Promise<Array<ChunkRecord & { _distance?: number }>> {
  const db = adminDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ref: any = db.collection("resource_chunks");

  if (resourceId) {
    ref = ref.where("resource_id", "==", resourceId);
  } else {
    if (academicYear) ref = ref.where("academic_year", "==", academicYear);
    if (branch) ref = ref.where("branch", "==", branch);
    if (semester != null) ref = ref.where("semester", "==", semester);
  }

  try {
    const vectorQuery = ref.findNearest({
      vectorField: "embedding",
      queryVector: FieldValue.vector(queryVector),
      limit: VECTOR_CANDIDATE_LIMIT,
      distanceMeasure: "COSINE",
      distanceResultField: "_distance",
    });
    const snap = await vectorQuery.get();
    return (
      snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
        _distance: doc.get("_distance") as number | undefined,
      })) as Array<ChunkRecord & { _distance?: number }>
    ).filter((chunk) =>
      academicYear
        ? matchesAcademicYear(
            chunk.academic_year,
            academicYear as AcademicYear,
          )
        : true,
    );
  } catch (err) {
    console.warn("Vector search unavailable, lexical only:", err);
    return [];
  }
}

function scoreChunks(
  chunks: ChunkRecord[],
  queryTerms: string[],
  stats: CorpusStats,
  categoryBoost: string[],
): Array<ChunkRecord & { score: number }> {
  const totalDocs = Math.max(stats.total_chunks, 1);
  const avgLen = stats.avg_token_count || 100;

  return chunks
    .map((chunk) => {
      let score = bm25Score(
        queryTerms,
        chunk.chunk_tokens || tokenize(chunk.text),
        stats.doc_freq,
        totalDocs,
        avgLen,
      );

      const title = (chunk.title || "").toLowerCase();
      const subject = (chunk.subject_name || "").toLowerCase();
      for (const term of queryTerms) {
        if (title.includes(term)) score += 3;
        if (subject.includes(term)) score += 2;
      }
      if (chunk.category && categoryBoost.includes(chunk.category)) score += 4;

      return { ...chunk, score };
    })
    .filter((c) => c.score > 0 || queryTerms.length === 0)
    .sort((a, b) => b.score - a.score);
}

async function fetchNeighborChunks(
  hits: ChunkRecord[],
  topN: number,
): Promise<ChunkRecord[]> {
  const db = adminDb();
  const neighbors: ChunkRecord[] = [];
  const seen = new Set(hits.map((h) => h.id));

  for (const hit of hits.slice(0, topN)) {
    for (const offset of [-1, 1]) {
      const idx = (hit.chunk_index ?? 0) + offset;
      if (idx < 0) continue;
      const neighborId = `${hit.resource_id}_${idx}`;
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      const doc = await db.collection("resource_chunks").doc(neighborId).get();
      if (doc.exists) {
        neighbors.push({ id: doc.id, ...doc.data() } as ChunkRecord);
      }
    }
  }

  return neighbors;
}

function dedupeByResource(
  ranked: Array<ChunkRecord & { fusedScore: number }>,
  maxPerResource: number,
): Array<ChunkRecord & { fusedScore: number }> {
  const counts = new Map<string, number>();
  const out: Array<ChunkRecord & { fusedScore: number }> = [];

  for (const item of ranked) {
    const rid = item.resource_id;
    const count = counts.get(rid) ?? 0;
    if (count >= maxPerResource) continue;
    counts.set(rid, count + 1);
    out.push(item);
  }

  return out;
}

function buildContext(
  hits: Array<ChunkRecord & { fusedScore: number }>,
  limit: number,
): { sources: RetrievalSource[]; contextBlocks: string[]; contextChars: number } {
  const sources: RetrievalSource[] = [];
  const contextBlocks: string[] = [];
  let contextChars = 0;

  for (let i = 0; i < Math.min(hits.length, limit); i++) {
    const hit = hits[i];
    const marker = `S${i + 1}`;
    const snippet = hit.text.slice(0, 800);
    const block = `[${marker}] ${hit.subject_name} · ${hit.title} · ${hit.section_label}\n${snippet}`;

    if (contextChars + block.length > CONTEXT_BUDGET_CHARS) break;

    contextBlocks.push(block);
    contextChars += block.length;

    sources.push({
      id: hit.id,
      marker,
      resource_id: hit.resource_id,
      chunk_index: hit.chunk_index,
      title: hit.title,
      subject_name: hit.subject_name,
      section_label: hit.section_label,
      heading: hit.heading,
      file_url: hit.file_url,
      branch: hit.branch,
      semester: hit.semester,
      category: hit.category,
      snippet,
      score: hit.fusedScore,
    });
  }

  return { sources, contextBlocks, contextChars };
}

export async function retrieve(params: RetrieveParams): Promise<RetrievalResult> {
  const {
    query,
    academicYear = LEGACY_ACADEMIC_YEAR,
    branch,
    semester,
    resourceId,
    limit = 5,
    categoryBoost: categoryBoostIn,
  } = params;

  const cleaned = cleanQuery(query);
  const baseTerms = tokenize(cleaned);
  const queryTerms = expandQueryTerms(baseTerms).slice(0, MAX_QUERY_TERMS);
  const categoryBoost = categoryBoostIn?.length
    ? categoryBoostIn
    : detectCategoryBoost(query);

  const cacheKey = JSON.stringify({
    cleaned,
    academicYear,
    branch,
    semester,
    resourceId,
    limit,
  });
  const cached = getRetrievalCache(cacheKey);
  if (cached) return cached;

  const stats = await loadCorpusStats();
  let widened = false;

  let lexical = await lexicalCandidates(
    queryTerms,
    academicYear,
    branch,
    semester,
    resourceId,
  );
  let queryVector: number[] | null = null;

  if (process.env.GEMINI_API_KEY && cleaned.length > 2) {
    try {
      queryVector = await embedQuery(cleaned);
    } catch (err) {
      console.warn("Query embedding failed:", err);
    }
  }

  let vector: Array<ChunkRecord & { _distance?: number }> = [];
  if (queryVector?.length) {
    vector = await vectorCandidates(
      queryVector,
      academicYear,
      branch,
      semester,
      resourceId,
    );
  }

  if (lexical.length === 0 && vector.length === 0 && branch && !resourceId) {
    widened = true;
    lexical = await lexicalCandidates(
      queryTerms,
      academicYear,
      branch,
      undefined,
      resourceId,
    );
    if (queryVector?.length) {
      vector = await vectorCandidates(
        queryVector,
        academicYear,
        branch,
        undefined,
        resourceId,
      );
    }
  }

  const chunkMap = new Map<string, ChunkRecord>();
  for (const c of [...lexical, ...vector]) chunkMap.set(c.id, c);
  const allChunks = [...chunkMap.values()];

  const lexicalRanked = scoreChunks(allChunks, queryTerms, stats, categoryBoost).map(
    (c) => ({ id: c.id, score: c.score }),
  );

  const vectorRanked = vector
    .sort((a, b) => (a._distance ?? 1) - (b._distance ?? 1))
    .map((c) => ({ id: c.id, score: 1 - (c._distance ?? 1) }));

  const fusedScores = reciprocalRankFusion(
    [lexicalRanked, vectorRanked],
    RRF_K,
  );

  let ranked = allChunks
    .map((chunk) => ({
      ...chunk,
      fusedScore: fusedScores.get(chunk.id) ?? 0,
    }))
    .filter((c) => c.fusedScore > 0)
    .sort((a, b) => b.fusedScore - a.fusedScore);

  ranked = dedupeByResource(ranked, MAX_CHUNKS_PER_RESOURCE);

  const topHits = ranked.slice(0, limit + NEIGHBOR_EXPANSION_TOP);
  const neighbors = await fetchNeighborChunks(topHits, NEIGHBOR_EXPANSION_TOP);

  const mergedMap = new Map<string, ChunkRecord & { fusedScore: number }>();
  for (const h of ranked) mergedMap.set(h.id, h);
  for (const n of neighbors) {
    if (!mergedMap.has(n.id)) {
      mergedMap.set(n.id, { ...n, fusedScore: (mergedMap.get(n.resource_id + "_0")?.fusedScore ?? 0) * 0.5 });
    }
  }

  const finalRanked = [...mergedMap.values()].sort(
    (a, b) => b.fusedScore - a.fusedScore,
  );

  const { sources, contextBlocks, contextChars } = buildContext(finalRanked, limit);

  const result: RetrievalResult = {
    sources,
    contextBlocks,
    contextChars,
    widened,
    queryTerms,
  };

  setRetrievalCache(cacheKey, result);
  return result;
}
