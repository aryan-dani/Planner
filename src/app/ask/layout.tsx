import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask AI",
  description: "RAG-powered academic assistant grounded in your course materials.",
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
