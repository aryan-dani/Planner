import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Browse notes, presentations, labs, and PYQs organized by branch and semester.",
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
