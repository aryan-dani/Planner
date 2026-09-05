import { describe, expect, it } from "vitest";
import { safeEqualSecret } from "@/lib/safeEqual";

describe("safeEqualSecret", () => {
  it("returns true for equal strings", () => {
    expect(safeEqualSecret("secret", "secret")).toBe(true);
  });

  it("returns false for unequal lengths", () => {
    expect(safeEqualSecret("ab", "abc")).toBe(false);
    expect(safeEqualSecret("abc", "ab")).toBe(false);
  });

  it("handles empty strings", () => {
    expect(safeEqualSecret("", "")).toBe(true);
    expect(safeEqualSecret("", "x")).toBe(false);
  });
});
