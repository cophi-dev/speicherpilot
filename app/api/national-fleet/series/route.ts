import { NextResponse } from "next/server";

import {
  fleetChartSeriesForDay,
  fleetChartSeriesForMonth,
  fleetSeriesJsonResponse,
} from "@/lib/nationalFleetSeriesPayload";
import {
  nationalFleetMonthAvailable,
  parseFleetFactor,
  parseFleetStrategy,
  sliceFleetDay,
} from "@/lib/nationalMonthFleetModel";
import {
  loadNationalFleetRunSeries,
} from "@/lib/nationalMonthFleetModel.server";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthKey = searchParams.get("monat") ?? "2026-10";
  const dateKey = searchParams.get("tag");
  const factor = parseFleetFactor(searchParams.get("faktor") ?? undefined);
  const strategy = parseFleetStrategy(searchParams.get("fahrweise") ?? undefined);

  if (!nationalFleetMonthAvailable(monthKey)) {
    return NextResponse.json({ error: "Kein Modellmonat" }, { status: 404 });
  }

  const run = loadNationalFleetRunSeries(factor, strategy);
  const compareRun = factor !== 1 ? loadNationalFleetRunSeries(1, strategy) : null;

  if (dateKey) {
    const slice = sliceFleetDay(run, dateKey);
    if (!slice) {
      return NextResponse.json({ error: "Kein Tag im Lauf" }, { status: 404 });
    }
    const seriesBundle = fleetChartSeriesForDay(run, compareRun, slice.indices, factor);
    return NextResponse.json(
      fleetSeriesJsonResponse({
        monthKey,
        factor,
        strategy,
        dateKey,
        intervalCount: slice.indices.length,
        bundle: seriesBundle,
      }),
      {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  }

  const seriesBundle = fleetChartSeriesForMonth(run, compareRun, factor);
  return NextResponse.json(
    fleetSeriesJsonResponse({
      monthKey,
      factor,
      strategy,
      intervalCount: run.intervalCount,
      bundle: seriesBundle,
    }),
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
