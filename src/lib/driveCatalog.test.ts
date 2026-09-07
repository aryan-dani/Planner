import { describe, it, expect } from "vitest";
import {
  generateId,
  resourceIdFromPath,
  subjectIdFromParts,
  parseDrivePath,
  categoryFromSegment,
  buildDestSegments,
  titleCaseSubject,
  previewUrl,
} from "../../runtime/lib/driveCatalog.mjs";

describe("driveCatalog ids", () => {
  it("generateId is stable and uuid-shaped", () => {
    const a = generateId("hello");
    const b = generateId("hello");
    expect(a).toBe(b);
    expect(a).toMatch(
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/,
    );
  });

  it("resourceIdFromPath matches path hash", () => {
    const path = "2026-2027/AIDS/Sem_5_AIDS/Sem_5_Notes/GML/GML_Unit_1_Notes.pdf";
    expect(resourceIdFromPath(path)).toBe(generateId(path));
  });

  it("subjectIdFromParts is case-normalized", () => {
    expect(subjectIdFromParts("2026-2027", "AIDS", 5, "Gml")).toBe(
      subjectIdFromParts("2026-2027", "AIDS", 5, "gml"),
    );
  });
});

describe("parseDrivePath", () => {
  it("parses year-scoped notes path", () => {
    const p = parseDrivePath(
      "2026-2027/AIDS/Sem_5_AIDS/Sem_5_Notes/GML/GML_Unit_1_Notes.pdf",
    )!;
    expect(p.ok).toBe(true);
    expect(p.academicYear).toBe("2026-2027");
    expect(p.branch).toBe("AIDS");
    expect(p.semester).toBe(5);
    expect(p.category).toBe("notes");
    expect(p.subjectName).toBe("GML");
    expect(p.fileName).toBe("GML_Unit_1_Notes.pdf");
  });

  it("title-cases multi-token subjects", () => {
    const p = parseDrivePath(
      "2026-2027/AIDS/Sem_5_AIDS/Sem_5_Notes/Machine_Learning/ML_Unit_1_Notes.pdf",
    )!;
    expect(p.subjectName).toBe("Machine Learning");
  });

  it("detects syllabus special case", () => {
    const p = parseDrivePath("2026-2027/AIDS/Sem_5_AIDS/Sem_5_Syllabus.pdf")!;
    expect(p.ok).toBe(true);
    expect(p.subjectName).toBe("Syllabus");
  });

  it("rejects paths without Sem_ folder", () => {
    const p = parseDrivePath("random/file.pdf")!;
    expect(p.ok).toBe(false);
  });

  it("parses ppt category", () => {
    const p = parseDrivePath(
      "2026-2027/AIDS/Sem_5_AIDS/Sem_5_PPT/GML/GML_Unit_2.pptx",
    )!;
    expect(p.category).toBe("ppt");
  });
});

describe("categoryFromSegment", () => {
  it("maps known folders", () => {
    expect(categoryFromSegment("Sem_5_Notes")).toBe("notes");
    expect(categoryFromSegment("Sem_5_PPT")).toBe("ppt");
    expect(categoryFromSegment("Sem_5_PYQ")).toBe("pyq");
    expect(categoryFromSegment("Sem_5_Codes")).toBe("codes");
    expect(categoryFromSegment("Sem_5_WriteUps")).toBe("writeup");
  });

  it("detects solved question banks", () => {
    expect(categoryFromSegment("Sem_5_QB", "PS_QB_1_Solved.pdf")).toBe(
      "solved-question-bank",
    );
    expect(categoryFromSegment("Sem_5_QB", "PS_QB_1.pdf")).toBe("question-bank");
  });
});

describe("buildDestSegments", () => {
  it("builds notes path", () => {
    expect(
      buildDestSegments({
        year: "2026-2027",
        branch: "aids",
        semester: 5,
        subject: "GML",
        category: "notes",
      }),
    ).toEqual([
      "2026-2027",
      "AIDS",
      "Sem_5_AIDS",
      "Sem_5_Notes",
      "GML",
    ]);
  });

  it("builds ppt path", () => {
    expect(
      buildDestSegments({
        year: "2026-2027",
        branch: "AIDS",
        semester: 5,
        subject: "GML",
        category: "ppt",
      }),
    ).toEqual(["2026-2027", "AIDS", "Sem_5_AIDS", "Sem_5_PPT", "GML"]);
  });
});

describe("helpers", () => {
  it("titleCaseSubject", () => {
    expect(titleCaseSubject("graph_machine_learning")).toBe(
      "Graph Machine Learning",
    );
  });

  it("previewUrl", () => {
    expect(previewUrl("abc123")).toBe(
      "https://drive.google.com/file/d/abc123/preview",
    );
  });
});
