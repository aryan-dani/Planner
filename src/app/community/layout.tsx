import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community",
  description: "Shared flashcard decks from fellow students.",
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
