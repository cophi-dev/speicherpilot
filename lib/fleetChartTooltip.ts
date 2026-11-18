import type { ChartTooltipRow } from "@/components/charts/ChartTooltipPanel";
import { formatDeGw, formatDeGwh } from "@/lib/displayUnitFormat";
import type { FleetChartPoint } from "@/lib/nationalFleetCharts";

/** Werte wie die Achse der Flotten-Zeitreihe: 2 Dezimalstellen, aus den Daten. */
export function fleetTooltipRows(point: FleetChartPoint, compareRpGw?: number | null): ChartTooltipRow[] {
  const rows: ChartTooltipRow[] = [
    { label: "Restlast", value: formatDeGw(point.rGw, 2) },
    { label: "mit Speicher", value: formatDeGw(point.rpGw, 2) },
  ];
  if (compareRpGw != null) {
    rows.push({ label: "×1 Vergleich", value: formatDeGw(compareRpGw, 2) });
  }
  rows.push(
    { label: "Laden", value: formatDeGw(point.cMw / 1000, 2) },
    { label: "Entladen", value: formatDeGw(point.dMw / 1000, 2) },
    { label: "SoC", value: formatDeGwh(point.socGwh, 2) },
  );
  return rows;
}

export function fleetTooltipTime(point: FleetChartPoint): string {
  if (point.ts.includes("T")) {
    return point.ts.slice(11, 16);
  }
  return point.label || point.ts;
}
