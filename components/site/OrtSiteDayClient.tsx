"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { ReferenceParkModelDay } from "@/lib/referenceParkModelDay";
import type { NetzSelection } from "@/lib/netzDemo";

const SiteDay = dynamic(() => import("@/components/site/SiteDay").then((m) => ({ default: m.SiteDay })), {
  ssr: false,
  loading: () => <Skeleton className="mx-auto mt-8 h-[640px] max-w-[1200px]" />,
});

export function OrtSiteDayClient({
  modelDay,
  netzSelection,
}: {
  modelDay: ReferenceParkModelDay | null;
  netzSelection: NetzSelection;
}) {
  return <SiteDay modelDay={modelDay} netzSelection={netzSelection} />;
}
