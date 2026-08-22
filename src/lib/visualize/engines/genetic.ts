import { OptimizationState } from "@/lib/visualize/optimization";
import { AlgorithmStep } from "@/lib/visualize/types";
import { getLandscapeY, OPTIMIZATION_DOMAIN } from "@/lib/visualize/engines/hillClimbing";

export const GA_POPULATION_SIZE = 15;
export const GA_GENERATIONS = 15;

export function generateGeneticAlgorithmSteps(): AlgorithmStep<OptimizationState>[] {
  const steps: AlgorithmStep<OptimizationState>[] = [];
  let stepCounter = 0;

  let population: number[] = [];
  for (let i = 0; i < GA_POPULATION_SIZE; i++) {
    const randomX =
      OPTIMIZATION_DOMAIN.minX +
      Math.random() * (OPTIMIZATION_DOMAIN.maxX - OPTIMIZATION_DOMAIN.minX);
    population.push(randomX);
  }

  function pushStep(desc: string, line: number, pop: number[]) {
    let bestX = pop[0];
    let bestY = -Infinity;
    for (const x of pop) {
      const y = getLandscapeY(x);
      if (y > bestY) {
        bestX = x;
        bestY = y;
      }
    }

    steps.push({
      stepIndex: stepCounter++,
      description: desc,
      highlightedLine: line,
      state: {
        currentX: bestX,
        currentY: bestY,
        visitedX: [],
        consideredX: [],
        population: [...pop],
      },
      metrics: {
        nodesExplored: pop.length,
        frontierSize: 0,
        pathCost: 0,
        totalSteps: 0,
      },
    });
  }

  pushStep(
    `Initialized generation 0 with a random swarm of ${GA_POPULATION_SIZE} individuals.`,
    1,
    population,
  );

  for (let gen = 1; gen <= GA_GENERATIONS; gen++) {
    const popWithFitness = population.map((x) => ({ x, fitness: getLandscapeY(x) }));
    popWithFitness.sort((a, b) => b.fitness - a.fitness);

    pushStep(
      `Generation ${gen}: Evaluated fitness. Best individual found at x=${popWithFitness[0].x.toFixed(2)} with score ${popWithFitness[0].fitness.toFixed(2)}.`,
      2,
      population,
    );

    const newPopulation: number[] = [popWithFitness[0].x, popWithFitness[1].x];
    const parents = popWithFitness.slice(0, Math.floor(GA_POPULATION_SIZE / 2)).map((p) => p.x);

    pushStep(
      `Generation ${gen}: Selected top ${parents.length} individuals to reproduce.`,
      3,
      parents,
    );

    while (newPopulation.length < GA_POPULATION_SIZE) {
      const parent1 = parents[Math.floor(Math.random() * parents.length)];
      const parent2 = parents[Math.floor(Math.random() * parents.length)];
      const childX = (parent1 + parent2) / 2;
      const mutationRate = 0.2;
      const mutationAmt = (Math.random() - 0.5) * 4 * mutationRate;
      let mutatedChild = childX + mutationAmt;

      if (mutatedChild < OPTIMIZATION_DOMAIN.minX) mutatedChild = OPTIMIZATION_DOMAIN.minX;
      if (mutatedChild > OPTIMIZATION_DOMAIN.maxX) mutatedChild = OPTIMIZATION_DOMAIN.maxX;

      newPopulation.push(mutatedChild);
    }

    population = newPopulation;
    pushStep(
      `Generation ${gen}: Applied crossover and mutation to spawn a new generation.`,
      4,
      population,
    );
  }

  pushStep(
    `Evolution complete after ${GA_GENERATIONS} generations. Swarm has converged on the maxima.`,
    5,
    population,
  );

  steps.forEach((s) => (s.metrics.totalSteps = steps.length));
  return steps;
}
