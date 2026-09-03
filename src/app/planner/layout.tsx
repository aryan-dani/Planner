import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Planner",
  description: "Collaborative monthly planner for assignments and study sessions.",
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
