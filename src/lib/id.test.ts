import { describe, it, expect } from "vitest";
import { generateId } from "./id";

describe("generateId", () => {
  it("generates non-empty string IDs", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("produces distinct IDs across successive invocations", () => {
    const set = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      set.add(generateId());
    }
    expect(set.size).toBe(count);
  });
});
