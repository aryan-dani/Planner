import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getResourcesFromDB, getSubjectsFromDB } from "@/lib/dataFetcher";
import { resolveWorkspace } from "@/lib/workspace";
import PageSkeleton from "@/components/PageSkeleton";

const AskClient = dynamic(() => import("./AskClientComponent"), {
  loading: () => <PageSkeleton variant="simple" />,
});

export const revalidate = 600;

interface PageProps {
  searchParams: Promise<{ year?: string; branch?: string; semester?: string }>;
}

async function AskPageContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const { academicYear, branch, semester } = resolveWorkspace(params);
  const [subjectItems, resources] = await Promise.all([
    getSubjectsFromDB(academicYear, branch, semester),
    getResourcesFromDB(academicYear, branch, semester),
  ]);

  return (
    <AskClient
      initialWorkspace={{ academicYear, branch, semester }}
      initialSubjects={subjectItems.map((s) => s.name)}
      initialResources={resources}
    />
  );
}

export default function AskPage(props: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="simple" />}>
      <AskPageContent {...props} />
    </Suspense>
  );
}
