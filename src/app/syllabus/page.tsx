import SyllabusClient from "@/components/SyllabusClient";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";

export const revalidate = 3600;
export const dynamic = "force-static";

export default function SyllabusPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <SyllabusClient />
    </Suspense>
  );
}
