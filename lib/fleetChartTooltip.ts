import type { ChartTooltipRow } from "@/components/charts/ChartTooltipPanel";
import { formatQuantity } from "@/lib/formatQuantity";
import type { FleetChartPoint } from "@/lib/nationalFleetCharts";

/** Werte wie die Achse der Flotten-Zeitreihe: 2 Dezimalstellen, aus den Daten. */
export function fleetTooltipRows(point: FleetChartPoint, compareRpGw?: number | null): ChartTooltipRow[] {
  const rows: ChartTooltipRow[] = [
    { label: "Restlast", value: `${formatQuantity(point.rGw, "de", 2)} GW` },
    { label: "mit Speicher", value: `${formatQuantity(point.rpGw, "de", 2)} GW` },
  ];
  if (compareRpGw != null) {
    rows.push({ label: "×1 Vergleich", value: `${formatQuantity(compareRpGw, "de", 2)} GW` });
  }
  rows.push(
    { label: "Laden", value: `${formatQuantity(point.cMw / 1000, "de", 2)} GW` },
    { label: "Entladen", value: `${formatQuantity(point.dMw / 1000, "de", 2)} GW` },
    { label: "SoC", value: `${formatQuantity(point.socGwh, "de", 2)} GWh` },
  );
  return rows;
}

export function fleetTooltipTime(point: FleetChartPoint): string {
  if (point.ts.includes("T")) {
    return point.ts.slice(11, 16);
  }
  return point.label || point.ts;
}
