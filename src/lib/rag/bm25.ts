import {
  BM25_B,
  BM25_K1,
  BM25_CANDIDATE_LIMIT,
} from "./config";
import type { CorpusStats } from "./types";

export function bm25Score(
  queryTerms: string[],
  docTokens: string[],
  docFreq: Record<string, number>,
  totalDocs: number,
  avgDocLen: number,
): number {
  if (queryTerms.length === 0 || docTokens.length === 0 || totalDocs === 0) return 0;

  const tf = new Map<string, number>();
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);

  const docLen = docTokens.length;
  let score = 0;

  for (const term of queryTerms) {
    const freq = tf.get(term) ?? 0;
    if (freq === 0) continue;

    const df = docFreq[term] ?? 0.5;
    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
    const numerator = freq * (BM25_K1 + 1);
    const denominator =
      freq + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / Math.max(avgDocLen, 1)));
    score += idf * (numerator / denominator);
  }

  return score;
}

export function reciprocalRankFusion(
  rankedLists: Array<Array<{ id: string; score?: number }>>,
  k: number,
): Map<string, number> {
  const fused = new Map<string, number>();

  for (const list of rankedLists) {
    list.forEach((item, rank) => {
      const rrf = 1 / (k + rank + 1);
      fused.set(item.id, (fused.get(item.id) ?? 0) + rrf);
    });
  }

  return fused;
}

export function defaultCorpusStats(): CorpusStats {
  return {
    total_chunks: 1,
    avg_token_count: 100,
    doc_freq: {},
    updated_at: new Date(0).toISOString(),
  };
}

export function scoreLexicalCandidates(
  queryTerms: string[],
  docs: Array<{
    id: string;
    chunk_tokens?: string[];
    token_count?: number;
    title?: string;
    subject_name?: string;
    category?: string;
  }>,
  stats: CorpusStats,
  categoryBoost: string[] = [],
): Array<{ id: string; score: number }> {
  const totalDocs = Math.max(stats.total_chunks, 1);
  const avgLen = stats.avg_token_count || 100;

  return docs
    .map((doc) => {
      let score = bm25Score(
        queryTerms,
        doc.chunk_tokens || [],
        stats.doc_freq,
        totalDocs,
        avgLen,
      );

      const title = (doc.title || "").toLowerCase();
      const subject = (doc.subject_name || "").toLowerCase();
      for (const term of queryTerms) {
        if (title.includes(term)) score += 3;
        if (subject.includes(term)) score += 2;
      }
      if (doc.category && categoryBoost.includes(doc.category)) score += 4;

      return { id: doc.id, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, BM25_CANDIDATE_LIMIT);
}
