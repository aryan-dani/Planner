"use client";

import dynamic from "next/dynamic";

const ActivityHeatmap = dynamic(() => import("@/components/ActivityHeatmap"), {
  ssr: false,
  loading: () => <div className="w-full h-72 sm:h-80 skeleton rounded-2xl" />,
});

export default function HomeHeatmap() {
  return <ActivityHeatmap />;
}
