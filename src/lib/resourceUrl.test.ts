import { describe, expect, it } from "vitest";
import {
  parseResourceFilter,
  resolveSubjectName,
  subjectToSlug,
  pageFromSectionLabel,
  parseResourceFolder,
  buildResourcesHref,
} from "@/lib/resourceUrl";

describe("parseResourceFilter", () => {
  it("parses known filters and defaults to all", () => {
    expect(parseResourceFilter("notes")).toBe("notes");
    expect(parseResourceFilter("PYQ")).toBe("pyq");
    expect(parseResourceFilter("unknown")).toBe("all");
    expect(parseResourceFilter(null)).toBe("all");
  });
});

describe("resolveSubjectName", () => {
  const subjects = ["Operating Systems", "Machine Learning"];

  it("matches exact and case-insensitive slugs", () => {
    expect(resolveSubjectName("Operating Systems", subjects)).toBe(
      "Operating Systems",
    );
    expect(resolveSubjectName("machine%20learning", subjects)).toBe(
      "Machine Learning",
    );
    expect(resolveSubjectName("Missing", subjects)).toBeNull();
    expect(resolveSubjectName(null, subjects)).toBeNull();
  });
});

describe("subjectToSlug", () => {
  it("encodes subject for URL", () => {
    expect(subjectToSlug("Machine Learning")).toBe("Machine%20Learning");
  });
});

describe("pageFromSectionLabel", () => {
  it("parses 1-based page numbers", () => {
    expect(pageFromSectionLabel("Page 12")).toBe(12);
    expect(pageFromSectionLabel("page 1")).toBe(1);
    expect(pageFromSectionLabel("Unit 2")).toBeNull();
    expect(pageFromSectionLabel(undefined)).toBeNull();
  });
});

describe("parseResourceFolder", () => {
  it("accepts legacy and scoped folder ids", () => {
    expect(parseResourceFolder("assignment-1")).toBe("assignment-1");
    expect(parseResourceFolder("unit-2")).toBe("unit-2");
    expect(parseResourceFolder("year-2024")).toBe("year-2024");
    expect(parseResourceFolder("other")).toBe("other");
    expect(parseResourceFolder("osl::assignment-2a")).toBe("osl::assignment-2a");
    expect(parseResourceFolder("bad")).toBeNull();
    expect(parseResourceFolder(null)).toBeNull();
  });
});

describe("buildResourcesHref", () => {
  it("builds resources URL with optional params", () => {
    expect(
      buildResourcesHref({
        academicYear: "2026-2027",
        branch: "AIDS",
        semester: 5,
        subject: "OS",
        filter: "notes",
        folder: "unit-1",
        view: "list",
        page: 3,
      }),
    ).toBe(
      "/resources?year=2026-2027&branch=AIDS&semester=5&subject=OS&filter=notes&folder=unit-1&view=list&page=3",
    );

    expect(
      buildResourcesHref({
        branch: "CSE",
        semester: 3,
        filter: "all",
      }),
    ).toBe("/resources?branch=CSE&semester=3");
  });
});
