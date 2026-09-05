import { describe, expect, it } from "vitest";
import {
  isAcademicYear,
  isBranch,
  isSemester,
  matchesAcademicYear,
  LEGACY_ACADEMIC_YEAR,
} from "@/lib/academic/scope";

describe("isAcademicYear", () => {
  it("accepts known years and rejects others", () => {
    expect(isAcademicYear("2026-2027")).toBe(true);
    expect(isAcademicYear("2025-2026")).toBe(true);
    expect(isAcademicYear("2024-2025")).toBe(false);
    expect(isAcademicYear("")).toBe(false);
  });
});

describe("isBranch", () => {
  it("accepts known branches and rejects others", () => {
    expect(isBranch("AIDS")).toBe(true);
    expect(isBranch("CSE")).toBe(true);
    expect(isBranch("ECE")).toBe(true);
    expect(isBranch("ME")).toBe(false);
  });
});

describe("isSemester", () => {
  it("accepts 1–8 and rejects others", () => {
    expect(isSemester(1)).toBe(true);
    expect(isSemester(8)).toBe(true);
    expect(isSemester(0)).toBe(false);
    expect(isSemester(9)).toBe(false);
  });
});

describe("matchesAcademicYear", () => {
  it("treats missing docYear as legacy only", () => {
    expect(matchesAcademicYear(undefined, LEGACY_ACADEMIC_YEAR)).toBe(true);
    expect(matchesAcademicYear(null, LEGACY_ACADEMIC_YEAR)).toBe(true);
    expect(matchesAcademicYear(undefined, "2026-2027")).toBe(false);
  });

  it("requires exact match when docYear is set", () => {
    expect(matchesAcademicYear("2026-2027", "2026-2027")).toBe(true);
    expect(matchesAcademicYear("2025-2026", "2026-2027")).toBe(false);
  });
});
