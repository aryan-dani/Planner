import { describe, expect, it } from "vitest";
import {
  manhattanDistance,
  euclideanDistance,
  chebyshevDistance,
} from "@/lib/visualize/heuristics";

describe("heuristics", () => {
  const a = { row: 0, col: 0 };
  const b = { row: 3, col: 4 };

  it("computes manhattan distance", () => {
    expect(manhattanDistance(a, b)).toBe(7);
  });

  it("computes euclidean distance", () => {
    expect(euclideanDistance(a, b)).toBe(5);
  });

  it("computes chebyshev distance", () => {
    expect(chebyshevDistance(a, b)).toBe(4);
  });
});
