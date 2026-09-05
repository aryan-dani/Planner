import type { Metadata } from "next";
import SupportClient from "./SupportClient";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Support",
  description: "Optional support for Utility. UPI contribution to keep the workspace running.",
};

export default function SupportPage() {
  return (
    <div className="flex-1 w-full page-fade-in">
      <div className="max-w-3xl mx-auto page-gutter pt-16 pb-20 md:pt-24">
        <PageHeader
          className="mb-14"
          size="hero"
          eyebrow="Utility"
          title="Support the project"
          description="Optional. If this workspace helped your semester, a small UPI contribution keeps hosting and updates going."
        />

        <SupportClient />
      </div>
    </div>
  );
}
