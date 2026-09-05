import { describe, expect, it } from "vitest";
import {
  reciprocalRankFusion,
  scoreLexicalCandidates,
} from "@/lib/rag/bm25";

describe("reciprocalRankFusion", () => {
  it("fuses ranked lists with RRF scores", () => {
    const fused = reciprocalRankFusion(
      [
        [{ id: "a" }, { id: "b" }],
        [{ id: "b" }, { id: "c" }],
      ],
      60,
    );
    expect(fused.get("b")).toBeCloseTo(1 / 61 + 1 / 61);
    expect(fused.get("a")).toBeCloseTo(1 / 61);
    expect(fused.get("c")).toBeCloseTo(1 / 62);
  });
});

describe("scoreLexicalCandidates", () => {
  const stats = {
    total_chunks: 2,
    avg_token_count: 4,
    doc_freq: { sql: 1, database: 1 },
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("scores matching docs and applies category boost", () => {
    const scored = scoreLexicalCandidates(
      ["sql"],
      [
        {
          id: "1",
          chunk_tokens: ["sql", "query", "join"],
          title: "SQL Basics",
          category: "notes",
        },
        {
          id: "2",
          chunk_tokens: ["unrelated"],
          title: "Other",
          category: "ppt",
        },
      ],
      stats,
      ["notes"],
    );
    expect(scored[0].id).toBe("1");
    expect(scored[0].score).toBeGreaterThan(0);
    expect(scored.find((d) => d.id === "2")).toBeUndefined();
  });
});
