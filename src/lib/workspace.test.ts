import { describe, expect, it } from "vitest";
import {
  parseAcademicYear,
  parseBranch,
  parseSemester,
  resolveWorkspace,
  sanitizeRedirectTo,
  workspaceQuery,
  DEFAULT_ACADEMIC_YEAR,
  DEFAULT_BRANCH,
  DEFAULT_SEMESTER,
} from "@/lib/workspace";

describe("parseAcademicYear", () => {
  it("parses valid years and rejects invalid", () => {
    expect(parseAcademicYear("2026-2027")).toBe("2026-2027");
    expect(parseAcademicYear(" 2025-2026 ")).toBe("2025-2026");
    expect(parseAcademicYear("nope")).toBeNull();
    expect(parseAcademicYear(null)).toBeNull();
  });
});

describe("parseBranch", () => {
  it("uppercases and validates", () => {
    expect(parseBranch("aids")).toBe("AIDS");
    expect(parseBranch("CSE")).toBe("CSE");
    expect(parseBranch("xyz")).toBeNull();
    expect(parseBranch(undefined)).toBeNull();
  });
});

describe("parseSemester", () => {
  it("parses numbers and strings in range", () => {
    expect(parseSemester(5)).toBe(5);
    expect(parseSemester("3")).toBe(3);
    expect(parseSemester(0)).toBeNull();
    expect(parseSemester("")).toBeNull();
    expect(parseSemester(null)).toBeNull();
  });
});

describe("resolveWorkspace", () => {
  it("lets URL win over prefs over defaults", () => {
    expect(resolveWorkspace({})).toEqual({
      academicYear: DEFAULT_ACADEMIC_YEAR,
      branch: DEFAULT_BRANCH,
      semester: DEFAULT_SEMESTER,
    });

    expect(
      resolveWorkspace(
        {},
        { academicYear: "2025-2026", branch: "CSE", semester: 2 },
      ),
    ).toEqual({
      academicYear: "2025-2026",
      branch: "CSE",
      semester: 2,
    });

    expect(
      resolveWorkspace(
        { year: "2026-2027", branch: "ECE", semester: "7" },
        { academicYear: "2025-2026", branch: "CSE", semester: 2 },
      ),
    ).toEqual({
      academicYear: "2026-2027",
      branch: "ECE",
      semester: 7,
    });
  });
});

describe("sanitizeRedirectTo", () => {
  it("rejects open redirects and accepts safe paths", () => {
    expect(sanitizeRedirectTo("//evil.com")).toBe("/planner");
    expect(sanitizeRedirectTo("https://evil.com")).toBe("/planner");
    expect(sanitizeRedirectTo("/path\\to")).toBe("/planner");
    expect(sanitizeRedirectTo("/planner?x=1")).toBe("/planner?x=1");
  });
});

describe("workspaceQuery", () => {
  it("builds query string", () => {
    expect(workspaceQuery("2026-2027", "AIDS", 5)).toBe(
      "year=2026-2027&branch=AIDS&semester=5",
    );
  });
});
