import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const GPAClient = dynamic(() => import("./GPAClientComponent"), {
  loading: () => <PageSkeleton variant="simple" />,
});

export const revalidate = 86400;

export default async function GPAPage() {
  return (
    <div className="min-h-screen">
      <GPAClient />
    </div>
  );
}
