import ResourcesClient from "@/components/ResourcesClient";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";

export const revalidate = 3600;
export const dynamic = "force-static";

export default function ResourcesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="split" />}>
      <ResourcesClient />
    </Suspense>
  );
}
