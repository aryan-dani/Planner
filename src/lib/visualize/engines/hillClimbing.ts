import { OptimizationState } from "@/lib/visualize/optimization";
import { AlgorithmStep } from "@/lib/visualize/types";

export const OPTIMIZATION_DOMAIN = { minX: 0, maxX: 20 };
export const OPTIMIZATION_RESOLUTION = 100;

export const getLandscapeY = (x: number) => {
  return Math.sin(x) + 0.5 * Math.sin(3 * x) + x * 0.15;
};

export function generateHillClimbingSteps(
  initialX: number,
  stepSize: number = 0.5,
): AlgorithmStep<OptimizationState>[] {
  const steps: AlgorithmStep<OptimizationState>[] = [];
  let stepCounter = 0;

  let currentX = initialX;
  const visitedX: number[] = [];

  function pushStep(
    desc: string,
    line: number,
    current: number,
    considered: number[] = [],
  ) {
    steps.push({
      stepIndex: stepCounter++,
      description: desc,
      highlightedLine: line,
      state: {
        currentX: current,
        currentY: getLandscapeY(current),
        visitedX: [...visitedX],
        consideredX: considered,
      },
      metrics: {
        nodesExplored: visitedX.length,
        frontierSize: considered.length,
        pathCost: 0,
        totalSteps: 0,
      },
    });
  }

  pushStep(
    `Initialized Hill Climbing at starting position x = ${currentX.toFixed(2)}.`,
    1,
    currentX,
  );

  const maxIterations = 100;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    visitedX.push(currentX);

    const leftX = currentX - stepSize;
    const rightX = currentX + stepSize;
    const neighbors = [];
    if (leftX >= OPTIMIZATION_DOMAIN.minX) neighbors.push(leftX);
    if (rightX <= OPTIMIZATION_DOMAIN.maxX) neighbors.push(rightX);

    pushStep("Evaluating adjacent state neighbors.", 2, currentX, neighbors);

    let bestNextX = currentX;
    let bestY = getLandscapeY(currentX);

    for (const nx of neighbors) {
      const ny = getLandscapeY(nx);
      if (ny > bestY) {
        bestNextX = nx;
        bestY = ny;
      }
    }

    if (bestNextX === currentX) {
      pushStep(
        "Peak reached. All immediate neighbors lead downhill. Local maximum found!",
        3,
        currentX,
      );
      break;
    } else {
      pushStep(
        `Higher evaluation found at x = ${bestNextX.toFixed(2)}. Moving uphill.`,
        4,
        currentX,
        [bestNextX],
      );
      currentX = bestNextX;
    }
  }

  steps.forEach((s) => (s.metrics.totalSteps = steps.length));
  return steps;
}
