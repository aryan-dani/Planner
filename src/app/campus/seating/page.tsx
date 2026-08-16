import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import { getFacultySeating, isIshaniConfigured } from "@/lib/ishani";
import SeatingClient from "./SeatingClient";

export const revalidate = 60;

export default async function FacultySeatingPage() {
  const configured = isIshaniConfigured();
  const seating = configured ? await getFacultySeating() : [];

  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <SeatingClient initialSeating={seating} configured={configured} />
    </Suspense>
  );
}
