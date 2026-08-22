import { Position } from "@/lib/visualize/grid";

export type HeuristicFunction = (a: Position, b: Position) => number;

export const manhattanDistance: HeuristicFunction = (a, b) => {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
};

export const euclideanDistance: HeuristicFunction = (a, b) => {
  return Math.sqrt(Math.pow(a.row - b.row, 2) + Math.pow(a.col - b.col, 2));
};

export const chebyshevDistance: HeuristicFunction = (a, b) => {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
};
