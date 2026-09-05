import { describe, expect, it } from "vitest";
import { MinHeap } from "@/lib/visualize/priorityQueue";

describe("MinHeap", () => {
  it("pops items in ascending order", () => {
    const heap = new MinHeap<number>((a, b) => a - b);
    heap.push(5);
    heap.push(1);
    heap.push(3);
    heap.push(2);
    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(2);
    expect(heap.pop()).toBe(3);
    expect(heap.pop()).toBe(5);
    expect(heap.pop()).toBeUndefined();
  });
});
