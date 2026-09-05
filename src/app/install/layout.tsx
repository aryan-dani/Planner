import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install",
  description:
    "Add Utility to your home screen or desktop for faster access and an app-like window.",
};

export default function InstallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
