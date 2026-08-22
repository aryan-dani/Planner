export interface AlgorithmMetrics {
  nodesExplored: number;
  frontierSize: number;
  pathCost: number;
  totalSteps: number;
}

export interface AlgorithmStep<TState> {
  stepIndex: number;
  description: string;
  highlightedLine: number;
  state: TState;
  metrics: AlgorithmMetrics;
}

export type AlgorithmCategory =
  | "Uninformed Search"
  | "Informed Search"
  | "Local Search"
  | "Constraint Satisfaction"
  | "Adversarial Search";

export type AlgorithmDifficulty = "Beginner" | "Intermediate" | "Advanced";

export type VisualizerType = "grid" | "game-tree" | "optimization" | "csp";

export interface AlgorithmMeta {
  id: string;
  name: string;
  shortName: string;
  category: AlgorithmCategory;
  description: string;
  longDescription: string;
  inOneSentence: string;
  howTo: [string, string, string];
  timeComplexity: string;
  spaceComplexity: string;
  difficulty: AlgorithmDifficulty;
  featured: boolean;
  tags: string[];
  visualizerType: VisualizerType;
}

export interface CategoryInfo {
  name: AlgorithmCategory;
  slug: string;
  description: string;
  algorithmCount: number;
}

export const VISUALIZE_AUTHORS =
  "Algorithm engines originally by Parth Doshi, Arya Inamdar, and Param Gadiya (MIT-WPU).";
