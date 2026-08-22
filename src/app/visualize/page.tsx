import { AlgorithmExplorer } from "@/components/visualize/AlgorithmExplorer";

export const metadata = {
  title: "Visualize",
  description:
    "Watch search, games, and N-Queens decide one step at a time.",
};

export default function VisualizePage() {
  return <AlgorithmExplorer />;
}
