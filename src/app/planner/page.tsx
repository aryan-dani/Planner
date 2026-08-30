import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const PlannerClient = dynamic(() => import("./PlannerClient"), {
  loading: () => <PageSkeleton variant="simple" />,
});

export const revalidate = 3600;

export default function PlannerPage() {
  return <PlannerClient />;
}
