/**
 * Pack extraction units into retrieval chunks without crossing slide boundaries.
 */

import { tokenize } from "./rag/tokenize.mjs";
import {
  CHUNK_TARGET_CHARS,
  CHUNK_OVERLAP_CHARS,
} from "./rag/config.mjs";

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

/**
 * @param {Array<{ text: string, sectionLabel: string, sectionIndex: number, heading?: string }>} units
 * @returns {Array<{ text: string, section_label: string, section_index: number, heading?: string, chunk_tokens: string[], token_count: number }>}
 */
export function chunkUnits(units) {
  /** @type {ReturnType<typeof chunkUnits>} */
  const chunks = [];

  for (const unit of units) {
    const text = unit.text.replace(/\u0000/g, "").trim();
    if (!text) continue;

    if (text.length <= CHUNK_TARGET_CHARS) {
      chunks.push(makeChunk(text, unit));
      continue;
    }

    const sentences = text.split(SENTENCE_SPLIT).filter(Boolean);
    let buffer = "";

    for (const sentence of sentences) {
      const candidate = buffer ? `${buffer} ${sentence}` : sentence;
      if (candidate.length > CHUNK_TARGET_CHARS && buffer) {
        chunks.push(makeChunk(buffer.trim(), unit));
        const overlap = buffer.slice(-CHUNK_OVERLAP_CHARS);
        buffer = overlap ? `${overlap} ${sentence}` : sentence;
      } else {
        buffer = candidate;
      }
    }

    if (buffer.trim()) {
      chunks.push(makeChunk(buffer.trim(), unit));
    }
  }

  return chunks.map((c, idx) => ({ ...c, chunk_index: idx }));
}

function makeChunk(text, unit) {
  const chunk_tokens = tokenize(text);
  return {
    text,
    section_label: unit.sectionLabel,
    section_index: unit.sectionIndex,
    heading: unit.heading,
    chunk_tokens,
    token_count: chunk_tokens.length,
  };
}

/**
 * Build doc-frequency map from all chunk token lists.
 * @param {Array<{ chunk_tokens: string[] }>} chunks
 */
export function buildDocFreq(chunks) {
  const df = new Map();
  for (const chunk of chunks) {
    const unique = new Set(chunk.chunk_tokens);
    for (const term of unique) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  return df;
}

/**
 * @param {Map<string, number>} df
 * @param {number} cap
 */
export function capDocFreq(df, cap) {
  const sorted = [...df.entries()].sort((a, b) => b[1] - a[1]).slice(0, cap);
  return Object.fromEntries(sorted);
}
