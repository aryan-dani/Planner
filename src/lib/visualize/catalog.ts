import {
  AlgorithmMeta,
  CategoryInfo,
} from "@/lib/visualize/types";

export const CATEGORIES: CategoryInfo[] = [
  {
    name: "Uninformed Search",
    slug: "uninformed-search",
    description: "Walk the grid without a hint toward the goal.",
    algorithmCount: 3,
  },
  {
    name: "Informed Search",
    slug: "informed-search",
    description: "Use a guess of remaining distance to steer.",
    algorithmCount: 2,
  },
  {
    name: "Local Search",
    slug: "local-search",
    description: "Climb or evolve toward a better score.",
    algorithmCount: 2,
  },
  {
    name: "Constraint Satisfaction",
    slug: "constraint-satisfaction",
    description: "Place pieces so every rule stays true.",
    algorithmCount: 1,
  },
  {
    name: "Adversarial Search",
    slug: "adversarial-search",
    description: "Choose a move assuming the other player plays well.",
    algorithmCount: 2,
  },
];

export const START_HERE_IDS = ["bfs", "a-star", "n-queens"] as const;

export const TOPIC_GROUPS: {
  id: string;
  title: string;
  blurb: string;
  ids: string[];
}[] = [
  {
    id: "path",
    title: "Find a path",
    blurb: "S is the start, G is the goal. Watch the search fill the grid.",
    ids: ["bfs", "dfs", "ucs", "greedy-bfs", "a-star"],
  },
  {
    id: "landscape",
    title: "Climb a curve",
    blurb: "A moving dot tries to reach the highest point on a bumpy line.",
    ids: ["hill-climbing", "genetic-algorithm"],
  },
  {
    id: "game",
    title: "Play both sides",
    blurb: "Squares want a high score. Circles want a low one.",
    ids: ["minimax", "alpha-beta"],
  },
  {
    id: "board",
    title: "Satisfy rules",
    blurb: "Place queens so none share a row, column, or diagonal.",
    ids: ["n-queens"],
  },
];

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: "bfs",
    name: "Breadth-First Search",
    shortName: "BFS",
    category: "Uninformed Search",
    description:
      "Checks every nearby cell before going farther — like a ripple from S.",
    longDescription:
      "BFS looks at all cells one step away, then two steps, and so on. On this grid it finds a shortest path.",
    inOneSentence:
      "It spreads out evenly from Start until it touches Goal.",
    howTo: [
      "Optional: drag on empty cells to draw walls, or leave the starter maze.",
      "Press Watch it run. You do not need to set anything else.",
      "Pause or tap Next if you want to see one cell at a time.",
    ],
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    difficulty: "Beginner",
    featured: true,
    tags: ["Queue", "Shortest Path", "Graph", "Level-Order"],
    visualizerType: "grid",
  },
  {
    id: "dfs",
    name: "Depth-First Search",
    shortName: "DFS",
    category: "Uninformed Search",
    description:
      "Goes as far as it can down one path, then backs up and tries another.",
    longDescription:
      "DFS follows one corridor until it is stuck, then backtracks. The path it finds is often longer than BFS.",
    inOneSentence:
      "It dives down one path first, then backs up when it hits a dead end.",
    howTo: [
      "Optional: draw walls to make corridors.",
      "Press Watch it run and notice how it prefers one direction.",
      "Compare this with BFS on the same maze — the path is often worse.",
    ],
    timeComplexity: "O(V + E)",
    spaceComplexity: "O(V)",
    difficulty: "Beginner",
    featured: true,
    tags: ["Stack", "Recursion", "Backtracking", "Graph"],
    visualizerType: "grid",
  },
  {
    id: "ucs",
    name: "Uniform Cost Search",
    shortName: "UCS",
    category: "Uninformed Search",
    description:
      "Always expands the cheapest path so far (Dijkstra on this grid).",
    longDescription:
      "UCS picks the cell with the lowest travel cost from Start. On this unweighted grid that cost is just the number of steps.",
    inOneSentence:
      "It always continues from the cheapest path it has found so far.",
    howTo: [
      "Draw walls if you want a harder maze.",
      "Press Watch it run.",
      "The filled path at the end is a cheapest route from S to G.",
    ],
    timeComplexity: "O(E + V log V)",
    spaceComplexity: "O(V)",
    difficulty: "Intermediate",
    featured: false,
    tags: ["Priority Queue", "Optimal", "Dijkstra"],
    visualizerType: "grid",
  },
  {
    id: "greedy-bfs",
    name: "Greedy Best-First Search",
    shortName: "Greedy BFS",
    category: "Informed Search",
    description:
      "Always steps toward Goal. Fast, but it can take a longer route.",
    longDescription:
      "Greedy search only looks at estimated distance to Goal. It ignores how far it has already walked, so it can get boxed in.",
    inOneSentence:
      "It always moves toward Goal and ignores how long the walk already is.",
    howTo: [
      "Leave the starter wall — greedy often hugs it.",
      "Press Watch it run.",
      "Then try A* on the same maze to see a smarter mix of cost and guess.",
    ],
    timeComplexity: "O(b^m)",
    spaceComplexity: "O(b^m)",
    difficulty: "Intermediate",
    featured: false,
    tags: ["Heuristic", "Priority Queue", "Informed"],
    visualizerType: "grid",
  },
  {
    id: "a-star",
    name: "A* Search",
    shortName: "A*",
    category: "Informed Search",
    description:
      "Balances “how far I walked” with “how far Goal looks.” Usually the best first pathfinder to learn.",
    longDescription:
      "A* scores each cell as distance from Start plus a guess to Goal. With a fair guess it still finds a shortest path, and it visits fewer cells than BFS.",
    inOneSentence:
      "It prefers cells that look both cheap so far and close to Goal.",
    howTo: [
      "You can run it on the starter maze as-is.",
      "Press Watch it run and notice it aims toward G more than BFS does.",
      "Use Next if you want to read each cell’s g, h, and f scores.",
    ],
    timeComplexity: "O(E log V)",
    spaceComplexity: "O(V)",
    difficulty: "Intermediate",
    featured: true,
    tags: ["Heuristic", "Optimal", "f(n) = g(n) + h(n)", "Grid"],
    visualizerType: "grid",
  },
  {
    id: "hill-climbing",
    name: "Hill Climbing",
    shortName: "Hill Climbing",
    category: "Local Search",
    description:
      "The dot only steps to a higher neighbor. It can get stuck on a small peak.",
    longDescription:
      "Hill climbing looks left and right and moves only if the curve goes up. A local peak stops it even if a taller peak exists elsewhere.",
    inOneSentence:
      "The dot only walks uphill, so a small bump can trap it.",
    howTo: [
      "Drag Start to pick where the climber begins.",
      "Press Watch it run.",
      "Try a start on the left vs the right — it may stop on different peaks.",
    ],
    timeComplexity: "O(∞) / State-dependent",
    spaceComplexity: "O(1)",
    difficulty: "Beginner",
    featured: true,
    tags: ["Optimization", "Greedy", "Local Optima"],
    visualizerType: "optimization",
  },
  {
    id: "genetic-algorithm",
    name: "Genetic Algorithm",
    shortName: "Genetic",
    category: "Local Search",
    description:
      "A swarm of dots breeds toward higher scores over generations.",
    longDescription:
      "Each generation keeps the best dots, mixes their positions, and adds a little randomness. Over time the swarm gathers near the high parts of the curve.",
    inOneSentence:
      "Many dots compete; the better ones mix to make the next generation.",
    howTo: [
      "Press Watch it run — no setup needed.",
      "The ring marks the current best dot.",
      "Let it play through a few generations, then reset and run again (it is random).",
    ],
    timeComplexity: "O(g * p * f)",
    spaceComplexity: "O(p)",
    difficulty: "Advanced",
    featured: false,
    tags: ["Population", "Evolution", "Mutation", "Crossover"],
    visualizerType: "optimization",
  },
  {
    id: "minimax",
    name: "Minimax",
    shortName: "Minimax",
    category: "Adversarial Search",
    description:
      "Squares try to raise the score. Circles try to lower it. The root is the fair result.",
    longDescription:
      "Minimax walks to the leaves, then each parent takes the best score for its player. The number on the root is the game value if both play perfectly.",
    inOneSentence:
      "MAX picks the largest child; MIN picks the smallest.",
    howTo: [
      "Press Watch it run to grow a random tree and play it through.",
      "Follow the highlighted node — it is the one being decided.",
      "When it finishes, the root number is the optimal score.",
    ],
    timeComplexity: "O(b^m)",
    spaceComplexity: "O(bm)",
    difficulty: "Intermediate",
    featured: true,
    tags: ["Game Theory", "Zero-Sum", "Game Tree"],
    visualizerType: "game-tree",
  },
  {
    id: "alpha-beta",
    name: "Alpha-Beta Pruning",
    shortName: "Alpha-Beta",
    category: "Adversarial Search",
    description:
      "Same answer as Minimax, but it skips branches that cannot change the result.",
    longDescription:
      "Alpha-beta keeps a window of scores that still matter. When a branch falls outside that window it is marked X and never visited.",
    inOneSentence:
      "It gets Minimax’s answer while skipping hopeless branches (the X nodes).",
    howTo: [
      "Press Watch it run.",
      "Faded X nodes were skipped — they cannot change the root score.",
      "Run it twice to see different trees prune in different places.",
    ],
    timeComplexity: "O(b^(m/2))",
    spaceComplexity: "O(bm)",
    difficulty: "Advanced",
    featured: false,
    tags: ["Pruning", "Optimization", "Game Tree"],
    visualizerType: "game-tree",
  },
  {
    id: "n-queens",
    name: "N-Queens",
    shortName: "N-Queens",
    category: "Constraint Satisfaction",
    description:
      "Places one queen per row, undoes a move when two queens attack.",
    longDescription:
      "The solver tries a column in the current row. If another queen shares that column or a diagonal, it tries the next column. If nothing fits, it removes the last queen and tries again.",
    inOneSentence:
      "It places a queen, and if two attack it takes the last one back.",
    howTo: [
      "Leave N at 4 the first time — it is short and easy to follow.",
      "Press Watch it run.",
      "× means that square is illegal. The board fills when a full solution is found.",
    ],
    timeComplexity: "O(N!)",
    spaceComplexity: "O(N)",
    difficulty: "Intermediate",
    featured: true,
    tags: ["CSP", "Backtracking", "Constraints", "Board"],
    visualizerType: "csp",
  },
];

export function getAlgorithm(id: string): AlgorithmMeta | undefined {
  return ALGORITHMS.find((algo) => algo.id === id);
}

export function algorithmsByCategory(category: CategoryInfo["name"]): AlgorithmMeta[] {
  return ALGORITHMS.filter((algo) => algo.category === category);
}
