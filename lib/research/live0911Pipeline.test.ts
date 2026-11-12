import dayFixture from "@/data/forschung/day.json";
import ec0911 from "@/data/forschung/ec_total_power_20261109_abruf0647.json";
import ec0911v2 from "@/data/forschung/ec_v2_20261109.json";

import { factorReductionGw, peakReductionGw } from "@/lib/research/nationalPeakShaveEngine";
import { totalFleetMw } from "@/lib/research/fleetBasis";
import { buildResearchHome } from "@/lib/research/loadResearchHome.server";
import { residualDaysFromEnergyChartsPayload } from "@/lib/research/legacyResearchPower";
import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";
import type { ResidualDay } from "@/lib/windSolarResidual";

function residualMw(slots: ResidualDay["slots"]): number[] {
  return slots.map((s) => s.loadMw - s.windMw - s.solarMw);
}

describe("live loader path · 09.11.2026 v3 fixture", () => {
  const parsed = parsePowerPayload(ec0911);
  const days = parsed ? residualDaysFromSlots(parsed) : [];
  const day = days.find((d) => d.dateBerlin === "2026-11-09");

  it("96 Restlast-Viertelstunden ≙ day.json (v3)", () => {
    expect(day).toBeTruthy();
    expect(day!.slots.length).toBe(96);
    const R = residualMw(day!.slots);
    const refMw = (dayFixture as { R: number[] }).R.map((gw) => gw * 1000);
    expect(R.length).toBe(refMw.length);
    for (let i = 0; i < R.length; i += 1) {
      expect(R[i]).toBeCloseTo(refMw[i]!, 0);
    }
  });

  it("Senkungen ×2/×5/×10 (Konvention k·Gesamtflotte) und ×5·4 h", () => {
    const R = residualMw(day!.slots);
    expect(factorReductionGw(R, 2)).toBeCloseTo(3.84, 2);
    expect(factorReductionGw(R, 5)).toBeCloseTo(6.15, 2);
    expect(factorReductionGw(R, 10)).toBeCloseTo(7.78, 2);
    const p5 = totalFleetMw(5, 4);
    expect(peakReductionGw(R, p5.powerMw, p5.energyMwh).reductionGw).toBeCloseTo(8.23, 2);
  });

  it("v2 API load_incl_self_consumption ≠ v3 Restlast (legacy Load)", () => {
    const d2 = residualDaysFromEnergyChartsPayload(ec0911v2).find((d) => d.dateBerlin === "2026-11-09");
    expect(d2).toBeTruthy();
    const R2 = residualMw(d2!.slots);
    const refMw = (dayFixture as { R: number[] }).R.map((gw) => gw * 1000);
    expect(factorReductionGw(R2, 5)).not.toBeCloseTo(5.81, 2);
    let maxGapMw = 0;
    for (let i = 0; i < refMw.length; i += 1) {
      maxGapMw = Math.max(maxGapMw, Math.abs(R2[i]! - refMw[i]!));
    }
    expect(maxGapMw).toBeGreaterThan(4000);
  });

  it("v1 legacy total_power fixture matches v3 (live loader path)", () => {
    const days = residualDaysFromEnergyChartsPayload(ec0911);
    const day0911 = days.find((d) => d.dateBerlin === "2026-11-09");
    expect(day0911?.slots.length).toBe(96);
    const R = residualMw(day0911!.slots);
    const refMw = (dayFixture as { R: number[] }).R.map((gw) => gw * 1000);
    for (let i = 0; i < refMw.length; i += 1) {
      expect(Math.abs(R[i]! - refMw[i]!)).toBeLessThanOrEqual(10);
    }
  });

  it("buildResearchHome picks 09.11 with v3 headline numbers", () => {
    const model = buildResearchHome(days, "2026-11-10");
    expect(model?.day.dateKey).toBe("2026-11-09");
    expect(model.day.stages.find((s) => s.factor === 5)!.reductionGw).toBeCloseTo(5.81, 2);
    expect(model.day.hero4hGw).toBeCloseTo(7.5, 2);
  });
});
