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
  const reserve = Boolean(props.prominentMonth && !props.dateKey);
  if (!reserve) {
    return <NationalFleetTimeSeriesChartInner {...props} />;
  }
  return (
    <div className="v4-fleet-ts-slot is-month-prominent">
      <NationalFleetTimeSeriesChartInner {...props} />
    </div>
  );
}
