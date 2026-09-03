import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GPA Calculator",
  description: "Calculate SGPA and project CGPA across semesters.",
};

export default function GpaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
