import { ProgressClient } from "@/components/visualize/ProgressClient";

export const metadata = {
  title: "Your runs",
  description: "Saved mazes and visualizers you have finished.",
};

export default function VisualizeProgressPage() {
  return <ProgressClient />;
}
