import { getResourcesFromDB } from "@/lib/dataFetcher";

import ResourcesClient from "@/components/ResourcesClient";
import { Suspense } from "react";
import { parseResourceFilter, parseResourceFolder } from "@/lib/resourceUrl";
import PageSkeleton from "@/components/PageSkeleton";
import { resolveWorkspace } from "@/lib/workspace";

export const revalidate = 600;

interface PageProps {
  searchParams: Promise<{
    year?: string;
    branch?: string;
    semester?: string;
    subject?: string;
    filter?: string;
    view?: string;
    folder?: string;
  }>;
}

export default async function ResourcesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { academicYear, branch, semester } = resolveWorkspace(params);
  const initialSubject = params.subject || null;
  const initialFilter = parseResourceFilter(params.filter);
  const initialView = params.view || null;
  const initialFolder = parseResourceFolder(params.folder);

  const resources = await getResourcesFromDB(academicYear, branch, semester);

  return (
    <Suspense fallback={<PageSkeleton variant="split" />}>
      <ResourcesClient
        initialResources={resources}
        academicYear={academicYear}
        branch={branch}
        semester={semester}
        initialSubject={initialSubject}
        initialFilter={initialFilter}
        initialView={initialView}
        initialFolder={initialFolder}
      />
    </Suspense>
  );
}
