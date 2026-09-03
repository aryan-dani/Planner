import { describe, expect, it } from "vitest";
import { folderIdForResource, assignmentFolderId } from "@/lib/resourceGroups";

function makeItem(title: string, category: string) {
  return {
    id: "1",
    title,
    category,
    subject_name: "ML",
    file_url: "",
    subject_id: "ml",
    created_at: "2026-01-01T00:00:00.000Z",
  } as unknown as Parameters<typeof folderIdForResource>[0];
}

describe("folderIdForResource", () => {
  it("deep-links letter-variant assignments to the child folder", () => {
    const id = folderIdForResource(
      makeItem("Sem_5_MLL_Assignment_2A_Notebook.ipynb", "codes"),
    );
    expect(id).toContain("assignment-2a");
  });

  it("uses base assignment folder for plain numbers", () => {
    const id = folderIdForResource(
      makeItem("Sem_5_MLL_Assignment_3_FCFS.c", "codes"),
    );
    expect(id).toBe(assignmentFolderId("3", "ML"));
  });
});
