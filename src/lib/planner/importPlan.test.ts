import { describe, expect, it } from "vitest";
import { normalizeImportedPlan } from "@/lib/planner/importPlan";

describe("normalizeImportedPlan", () => {
  const sampleData = { "2026-09-01": [{ id: "1", text: "Read", done: false, subtasks: [] }] };
  const sampleMeta = {
    title: "September",
    month: 9,
    year: 2026,
    is_public: false,
  };

  it("parses current { meta, data } format", () => {
    const result = normalizeImportedPlan({ meta: sampleMeta, data: sampleData });
    expect(result.legacy).toBe(false);
    expect(result.data).toEqual(sampleData);
    expect(result.meta).toEqual(sampleMeta);
  });

  it("parses legacy raw Record format", () => {
    const result = normalizeImportedPlan(sampleData);
    expect(result.legacy).toBe(true);
    expect(result.data).toEqual(sampleData);
    expect(result.meta).toBeUndefined();
  });

  it("throws on invalid input", () => {
    expect(() => normalizeImportedPlan(null)).toThrow("Invalid file format");
    expect(() => normalizeImportedPlan("bad")).toThrow("Invalid file format");
  });
});
