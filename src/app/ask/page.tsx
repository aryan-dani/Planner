import { Suspense } from "react";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const AskClient = dynamic(() => import("./AskClientComponent"), {
  loading: () => <PageSkeleton variant="simple" />,
});

export const revalidate = 600;

export default function AskPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="simple" />}>
      <AskClient />
    </Suspense>
  );
}
