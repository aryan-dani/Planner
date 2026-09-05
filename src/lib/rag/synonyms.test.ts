import { describe, expect, it } from "vitest";
import { expandQueryTerms, detectCategoryBoost } from "@/lib/rag/synonyms";

describe("expandQueryTerms", () => {
  it("expands abbreviations and spelling variants", () => {
    const expanded = expandQueryTerms(["dbms", "color"]);
    expect(expanded).toContain("dbms");
    expect(expanded).toContain("database");
    expect(expanded).toContain("color");
    expect(expanded).toContain("colour");
  });
});

describe("detectCategoryBoost", () => {
  it("detects pyq-related queries", () => {
    expect(detectCategoryBoost("previous year question paper")).toEqual([
      "pyq",
      "question-bank",
      "solved-question-bank",
    ]);
  });

  it("detects notes and code categories", () => {
    expect(detectCategoryBoost("unit 2 notes")).toEqual(["notes"]);
    expect(detectCategoryBoost("sample code implementation")).toEqual(["codes"]);
  });

  it("returns empty when no category signal", () => {
    expect(detectCategoryBoost("gradient descent")).toEqual([]);
  });
});
