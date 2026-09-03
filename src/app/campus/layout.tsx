import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campus",
  description: "Faculty seating, directory, and campus lab registry.",
};

export default function CampusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
