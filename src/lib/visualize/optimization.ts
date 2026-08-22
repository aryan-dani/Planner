export interface OptimizationState {
  currentX: number;
  currentY: number;
  visitedX: number[];
  consideredX: number[];
  population?: number[];
}
