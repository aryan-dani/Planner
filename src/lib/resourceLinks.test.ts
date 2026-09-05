import { describe, expect, it } from "vitest";
import type { ResourceItem } from "@/lib/dataFetcher";
import {
  parseWriteUpKey,
  parseAssignmentKey,
  findRelatedCodes,
} from "@/lib/resourceLinks";

function item(
  partial: Partial<ResourceItem> & Pick<ResourceItem, "id" | "title">,
): ResourceItem {
  return {
    file_url: "https://example.com/file.c",
    created_at: "2026-01-01",
    subject_name: "Operating Systems Lab",
    category: "codes",
    ...partial,
  };
}

describe("parseWriteUpKey", () => {
  it("extracts writeup keys", () => {
    expect(parseWriteUpKey("Sem_5_OSL_WriteUp_2.docx")).toBe("2");
    expect(parseWriteUpKey("Sem_5_OSL_WriteUp_2A.docx")).toBe("2A");
    expect(parseWriteUpKey("notes.pdf")).toBeNull();
  });
});

describe("parseAssignmentKey", () => {
  it("extracts assignment keys", () => {
    expect(parseAssignmentKey("Sem_5_OSL_Assignment_2A_Orphan.c")).toBe("2A");
    expect(parseAssignmentKey("Sem_5_OSL_Assignment_3_FCFS.c")).toBe("3");
    expect(parseAssignmentKey("readme.md")).toBeNull();
  });
});

describe("findRelatedCodes", () => {
  const writeup = item({
    id: "w1",
    title: "Sem_5_OSL_WriteUp_2.docx",
    category: "writeup",
    file_url: "https://example.com/w.docx",
  });

  const pool: ResourceItem[] = [
    writeup,
    item({ id: "c1", title: "Sem_5_OSL_Assignment_2_Base.c" }),
    item({ id: "c2", title: "Sem_5_OSL_Assignment_2A_Orphan.c" }),
    item({ id: "c3", title: "Sem_5_OSL_Assignment_3_Other.c" }),
    item({
      id: "c4",
      title: "Sem_5_OSL_Assignment_2B_Extra.c",
      subject_name: "Machine Learning",
    }),
  ];

  it("returns codes with matching assignment keys under the same subject", () => {
    const related = findRelatedCodes(writeup, pool);
    expect(related.map((r) => r.id)).toEqual(["c1", "c2"]);
  });
});
