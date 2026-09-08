import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import { getHomeCampusData, isIshaniConfigured } from "@/lib/ishani";
import DirectoryClient from "./DirectoryClient";

export const revalidate = 86400;

export default async function DirectoryPage() {
  const configured = isIshaniConfigured();
  const data = configured
    ? await getHomeCampusData()
    : { staff: [], infrastructure: [] };

  return (
    <Suspense fallback={<PageSkeleton variant="simple" />}>
      <DirectoryClient initialStaff={data.staff} configured={configured} />
    </Suspense>
  );
}
