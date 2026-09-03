import { describe, expect, it } from "vitest";
import { localDateKey } from "@/lib/dateLocal";

describe("localDateKey", () => {
  it("formats local calendar date as YYYY-MM-DD", () => {
    const d = new Date(2026, 8, 4, 1, 0, 0); // Sep 4 local
    expect(localDateKey(d)).toBe("2026-09-04");
  });

  it("formats the same calendar day as localDateKey consistently", () => {
    const d = new Date(2026, 8, 4, 23, 30, 0);
    expect(localDateKey(d)).toBe("2026-09-04");
    const morning = new Date(2026, 8, 4, 0, 30, 0);
    expect(localDateKey(morning)).toBe("2026-09-04");
  });
});
