import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syllabus",
  description: "Track course syllabus modules and schedule study blocks.",
};

export default function SyllabusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
