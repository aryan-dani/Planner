import { describe, expect, it } from "vitest";
import { parsePrompt, mergeEntries } from "@/lib/promptParser";

describe("parsePrompt", () => {
  it("parses day lines into dated tasks", () => {
    const entries = parsePrompt("27th -> DET unit 3 notes\n28th -> revision", 5, 2026);
    expect(entries).toHaveLength(2);
    expect(entries[0].date).toBe("2026-05-27");
    expect(entries[0].tasks[0].text).toBe("DET unit 3 notes");
    expect(entries[1].date).toBe("2026-05-28");
  });

  it("detects month rollover for low days after high days", () => {
    const entries = parsePrompt("31st -> wrap up\n1st -> next month start", 5, 2026);
    expect(entries.map((e) => e.date)).toEqual(["2026-05-31", "2026-06-01"]);
  });
});

describe("mergeEntries", () => {
  it("appends parsed tasks without overwriting existing dates", () => {
    const existing = {
      "2026-05-27": [
        { id: "old", text: "Existing", done: false, subtasks: [] },
      ],
    };
    const parsed = parsePrompt("27th -> New task", 5, 2026);
    const merged = mergeEntries(existing, parsed);
    expect(merged["2026-05-27"]).toHaveLength(2);
    expect(merged["2026-05-27"][0].text).toBe("Existing");
    expect(merged["2026-05-27"][1].text).toBe("New task");
  });
});
