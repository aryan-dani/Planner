import {
  getSubjectsFromDB,
  getSyllabusFile,
  getResourcesFromDB,
} from "@/lib/dataFetcher";

import SyllabusClient from "@/components/SyllabusClient";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import { resolveWorkspace } from "@/lib/workspace";

export const revalidate = 3600;

interface PageProps {
  searchParams: Promise<{
    branch?: string;
    semester?: string;
  }>;
}

export default async function SyllabusPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { branch, semester } = resolveWorkspace(params);

  const [subjects, syllabusUrl, resources] = await Promise.all([
    getSubjectsFromDB(branch, semester),
    getSyllabusFile(branch, semester),
    getResourcesFromDB(branch, semester),
  ]);

  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <SyllabusClient
        subjects={subjects}
        branch={branch}
        semester={semester}
        syllabusUrl={syllabusUrl}
        initialResources={resources}
      />
    </Suspense>
  );
}
