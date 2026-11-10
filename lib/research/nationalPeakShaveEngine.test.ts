import dayFixture from "@/data/forschung/day.json";
import ergebnisTeil1 from "@/data/forschung/ergebnis_teil1.json";
import weekRows from "@/data/forschung/woche-0311-0911.json";
import visionRows from "@/data/forschung/vision-oktober-neu.json";

import { additionalFleetMw } from "@/lib/research/fleetBasis";
import {
  factorReductionGw,
  peakReductionGw,
  saturationCurveGw,
} from "@/lib/research/nationalPeakShaveEngine";

const residualMw = (dayFixture as { R: number[] }).R.map((gw) => gw * 1000);

const close = (a: number, b: number, digits = 2) => {
  expect(a).toBeCloseTo(b, digits);
};

describe("nationalPeakShaveEngine · nachrechnung v3", () => {
  it("09.11.2026: ×2 / ×5 / ×10 mit 1,76 h", () => {
    close(factorReductionGw(residualMw, 2), 2.52, 2);
    close(factorReductionGw(residualMw, 5), 5.81, 2);
    close(factorReductionGw(residualMw, 10), 7.46, 2);
  });

  it("09.11.2026: ×5 mit 4 h", () => {
    const { powerMw, energyMwh } = {
      powerMw: 4 * 4644.09022,
      energyMwh: 4 * 4644.09022 * 4,
    };
    close(peakReductionGw(residualMw, powerMw, energyMwh).reductionGw, 7.5, 2);
  });

  it("Grenznutzen ×2→×5 und ×5→×10", () => {
    const curve = saturationCurveGw(residualMw, 10);
    const x2 = curve[1]!.reductionGw;
    const x5 = curve[4]!.reductionGw;
    const x10 = curve[9]!.reductionGw;
    close((x5 - x2) / (3 * 4.64409022), 0.236, 2);
    close((x10 - x5) / (5 * 4.64409022), 0.071, 2);
  });

  it("stimmt mit ergebnis_teil1 Kurve überein", () => {
    const teil1 = ergebnisTeil1 as {
      kurve_0911: Array<{ k: number; senkung_A: number }>;
    };
    for (const row of teil1.kurve_0911) {
      if (row.k === 1) continue;
      const { powerMw, energyMwh } = additionalFleetMw(row.k);
      const calc = peakReductionGw(residualMw, powerMw, energyMwh).reductionGw;
      close(calc, row.senkung_A, 3);
    }
  });

  it("Woche 03.–09.11. CSV-Referenz ×5", () => {
    const typed = weekRows as Array<{ tag: string; k: number; senkung_A: number }>;
    for (const tag of ["2026-11-09"]) {
      for (const k of [2, 5, 10] as const) {
        const ref = typed.find((r) => r.tag === tag && r.k === k);
        expect(ref).toBeTruthy();
        close(factorReductionGw(residualMw, k), ref!.senkung_A, 2);
      }
    }
  });

  it("Vision Oktober NEP B · 2 h", () => {
    const ref = (visionRows as Array<{ stufe: string; dauer_h: number; senkung_GW: number }>).find(
      (r) => r.stufe === "NEP B" && Math.abs(r.dauer_h - 2) < 0.01
    );
    expect(ref).toBeTruthy();
    close(ref!.senkung_GW, 16.85, 2);
  });
});
