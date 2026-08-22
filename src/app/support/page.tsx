import type { Metadata } from "next";
import SupportClient from "./SupportClient";

export const metadata: Metadata = {
  title: "Support",
  description: "Optional support for Utility. UPI contribution to keep the workspace running.",
};

export default function SupportPage() {
  return (
    <div className="flex-1 w-full page-fade-in">
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-20 md:pt-24">
        <header className="mb-14">
          <p className="font-display text-5xl md:text-6xl text-foreground tracking-tight mb-2">
            Utility
          </p>
          <h1 className="text-xl md:text-2xl font-medium text-foreground mb-4">
            Support the project
          </h1>
          <p className="text-base text-foreground-subtle max-w-md leading-relaxed">
            Optional. If this workspace helped your semester, a small UPI
            contribution keeps hosting and updates going.
          </p>
        </header>

        <SupportClient />
      </div>
    </div>
  );
}
