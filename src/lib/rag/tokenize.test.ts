import { describe, expect, it } from "vitest";
import { tokenize, termFrequency, stemWord } from "@/lib/rag/tokenize";
import { bm25Score } from "@/lib/rag/bm25";

describe("tokenize", () => {
  it("keeps term multiplicity for BM25 TF", () => {
    const tokens = tokenize("normal form normal form normalization", { stem: true });
    const tf = termFrequency(tokens);
    const normalish = [...tf.entries()].find(([t]) => t.startsWith("normal"));
    expect(normalish?.[1]).toBeGreaterThan(1);
  });

  it("stems common suffixes", () => {
    expect(stemWord("running")).toBe("runn");
  });
});

describe("bm25Score", () => {
  it("scores higher when term frequency is higher", () => {
    const docs = 100;
    const avg = 10;
    const df = { hash: 5 };
    const low = bm25Score(["hash"], ["hash", "table"], df, docs, avg);
    const high = bm25Score(
      ["hash"],
      ["hash", "hash", "hash", "table"],
      df,
      docs,
      avg,
    );
    expect(high).toBeGreaterThan(low);
  });
});
