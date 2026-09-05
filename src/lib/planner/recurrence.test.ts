import { describe, expect, it } from "vitest";
import { toggleTaskRecurring } from "@/lib/planner/recurrence";

const task = (id: string, text: string, isRecurring = false) => ({
  id,
  text,
  done: false,
  subtasks: [],
  isRecurring,
});

describe("toggleTaskRecurring", () => {
  it("toggles isRecurring off without propagation", () => {
    const plan = { "2026-09-03": [task("a", "Weekly review", true)] };
    const { plan: next, propagated } = toggleTaskRecurring(
      plan,
      "2026-09-03",
      "a",
      () => "new-id",
    );
    expect(propagated).toBe(false);
    expect(next["2026-09-03"][0].isRecurring).toBe(false);
    expect(Object.keys(next)).toHaveLength(1);
  });

  it("propagates weekly copies through the same month", () => {
    const plan = { "2026-09-03": [task("a", "Weekly review")] };
    let counter = 0;
    const { plan: next, propagated } = toggleTaskRecurring(
      plan,
      "2026-09-03",
      "a",
      () => `gen-${++counter}`,
    );
    expect(propagated).toBe(true);
    expect(next["2026-09-03"][0].isRecurring).toBe(true);
    expect(next["2026-09-10"]).toHaveLength(1);
    expect(next["2026-09-17"]).toHaveLength(1);
    expect(next["2026-09-24"]).toHaveLength(1);
    expect(next["2026-10-01"]).toBeUndefined();
    expect(next["2026-09-10"][0].text).toBe("Weekly review");
    expect(next["2026-09-10"][0].id).not.toBe("a");
    expect(next["2026-09-10"][0].done).toBe(false);
  });

  it("skips duplicate text on target dates", () => {
    const plan = {
      "2026-09-03": [task("a", "Weekly review")],
      "2026-09-10": [task("b", "Weekly review")],
    };
    const { plan: next } = toggleTaskRecurring(
      plan,
      "2026-09-03",
      "a",
      () => "gen-1",
    );
    expect(next["2026-09-10"]).toHaveLength(1);
    expect(next["2026-09-10"][0].id).toBe("b");
  });
});
