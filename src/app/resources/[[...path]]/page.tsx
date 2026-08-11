import { getResourcesFromDB } from "@/lib/dataFetcher";

import ResourcesClient from "@/components/ResourcesClient";
import { Branch, Semester } from "@/store/academicStore";
import { Suspense } from "react";
import { parseResourceFilter } from "@/lib/resourceUrl";
import PageSkeleton from "@/components/PageSkeleton";

export const revalidate = 600;

interface PageProps {
  searchParams: Promise<{
    branch?: string;
    semester?: string;
    subject?: string;
    filter?: string;
    view?: string;
  }>;
}

export default async function ResourcesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const branch = (params.branch as Branch) || "AIDS";
  const semester = Number(params.semester || "4") as Semester;
  const initialSubject = params.subject || null;
  const initialFilter = parseResourceFilter(params.filter);
  const initialView = params.view || null;

  const resources = await getResourcesFromDB(branch, semester);

  return (
    <Suspense fallback={<PageSkeleton variant="split" />}>
      <ResourcesClient
        initialResources={resources}
        branch={branch}
        semester={semester}
        initialSubject={initialSubject}
        initialFilter={initialFilter}
        initialView={initialView}
      />
    </Suspense>
  );
}
