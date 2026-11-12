import dayFixture from "@/data/forschung/day.json";
import ergebnisTeil1 from "@/data/forschung/ergebnis_teil1.json";
import weekRows from "@/data/forschung/woche-0311-0911.json";
import visionRows from "@/data/forschung/vision-oktober-neu.json";

import { totalFleetMw } from "@/lib/research/fleetBasis";
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
  it("09.11.2026: ×2 / ×5 / ×10 mit 1,76 h (Gesamtflotte)", () => {
    close(factorReductionGw(residualMw, 2), 3.84, 2);
    close(factorReductionGw(residualMw, 5), 6.15, 2);
    close(factorReductionGw(residualMw, 10), 7.78, 2);
  });

  it("09.11.2026: ×5 mit 4 h", () => {
    const { powerMw, energyMwh } = totalFleetMw(5, 4);
    close(peakReductionGw(residualMw, powerMw, energyMwh).reductionGw, 8.23, 2);
  });

  it("Grenznutzen ×2→×5 und ×5→×10", () => {
    const curve = saturationCurveGw(residualMw, 10);
    const x2 = curve[1]!.reductionGw;
    const x5 = curve[4]!.reductionGw;
    const x10 = curve[9]!.reductionGw;
    close((x5 - x2) / (3 * 4.64409022), 0.166, 2);
    close((x10 - x5) / (5 * 4.64409022), 0.071, 2);
  });

  it("monotone Senkung mit wachsendem k (Gesamtflotte)", () => {
    const curve = saturationCurveGw(residualMw, 10);
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i]!.reductionGw).toBeGreaterThanOrEqual(curve[i - 1]!.reductionGw - 1e-6);
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
