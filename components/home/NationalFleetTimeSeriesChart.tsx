"use client";

import dynamic from "next/dynamic";

import type { NationalFleetTimeSeriesChartProps } from "@/components/home/NationalFleetTimeSeriesChartInner";

const NationalFleetTimeSeriesChartInner = dynamic(
  () =>
    import("@/components/home/NationalFleetTimeSeriesChartInner").then((m) => ({
      default: m.NationalFleetTimeSeriesChart,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="v4-fleet-ts-tooltip num muted" role="status">
        Zeitreihen-Chart wird geladen …
      </p>
    ),
  },
);

export function NationalFleetTimeSeriesChart(props: NationalFleetTimeSeriesChartProps) {
  return <NationalFleetTimeSeriesChartInner {...props} />;
}
