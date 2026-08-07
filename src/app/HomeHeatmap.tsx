"use client";

import dynamic from "next/dynamic";

const ActivityHeatmap = dynamic(() => import("@/components/ActivityHeatmap"), {
  ssr: false,
  loading: () => <div className="w-full h-40 skeleton rounded-lg" />,
});

export default function HomeHeatmap() {
  return <ActivityHeatmap />;
}
