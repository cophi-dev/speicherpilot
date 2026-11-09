"use client";

import dynamic from "next/dynamic";

import { NationalFleetTimeSeriesChartSkeleton } from "@/components/home/NationalFleetTimeSeriesChartSkeleton";
import type { NationalFleetTimeSeriesChartProps } from "@/components/home/NationalFleetTimeSeriesChartInner";

const NationalFleetTimeSeriesChartInner = dynamic(
  () =>
    import("@/components/home/NationalFleetTimeSeriesChartInner").then((m) => ({
      default: m.NationalFleetTimeSeriesChart,
    })),
  {
    ssr: false,
    loading: () => <NationalFleetTimeSeriesChartSkeleton prominentMonth withCompareLegend />,
  },
);

export function NationalFleetTimeSeriesChart(props: NationalFleetTimeSeriesChartProps) {
  return <NationalFleetTimeSeriesChartInner {...props} />;
}
