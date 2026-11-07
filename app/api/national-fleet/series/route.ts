import { NextResponse } from "next/server";

import {
  getFleetRun,
  nationalFleetMonthAvailable,
  parseFleetFactor,
  parseFleetStrategy,
  sliceFleetDay,
} from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

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

  const bundle = loadNationalFleetMonthBundle();
  const run = getFleetRun(bundle, factor, strategy);
  const compareRun = factor !== 1 ? getFleetRun(bundle, 1, strategy) : null;

  if (dateKey) {
    const slice = sliceFleetDay(run, dateKey);
    if (!slice) {
      return NextResponse.json({ error: "Kein Tag im Lauf" }, { status: 404 });
    }
    const pick = (r: typeof run, indices: number[]) => ({
      timestamp_berlin: indices.map((i) => r.timestamp_berlin[i]),
      r_mw: indices.map((i) => r.r_mw[i]),
      r_prime_mw: indices.map((i) => r.r_prime_mw[i]),
      c_mw: indices.map((i) => r.c_mw[i]),
      d_mw: indices.map((i) => r.d_mw[i]),
      e_start_mwh: indices.map((i) => r.e_start_mwh[i]),
    });
    const idx = slice.indices;
    return NextResponse.json({
      monthKey,
      dateKey,
      factor,
      strategy,
      selected: pick(run, idx),
      compare: compareRun ? pick(compareRun, idx) : null,
    });
  }

  return NextResponse.json({
    monthKey,
    factor,
    strategy,
    intervalCount: run.intervalCount,
    selected: {
      timestamp_berlin: run.timestamp_berlin,
      r_mw: run.r_mw,
      r_prime_mw: run.r_prime_mw,
      c_mw: run.c_mw,
      d_mw: run.d_mw,
      e_start_mwh: run.e_start_mwh,
    },
    compare: compareRun
      ? {
          r_prime_mw: compareRun.r_prime_mw,
        }
      : null,
  });
}
