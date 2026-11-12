import { arbeitPathCallouts, buildArbeitWirkungModel } from "@/lib/monatKonzeptA";
import {
  buildDauerlinieFromRun,
  buildDauerlinieFromRun as buildC,
  dauerlinieSeriesSamples,
  isMonotonicNonIncreasing,
} from "@/lib/monatKonzeptC";
import { getFleetRun, monthStatsForRun } from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

describe("Paket 4 Konzept A — Sketchwerte Oktober", () => {
  const bundle = loadNationalFleetMonthBundle();
  const model = buildArbeitWirkungModel(bundle);

  it("12 Punkte aus Bundle-Summary", () => {
    expect(model.points.length).toBe(12);
  });

  it("Referenzspitze 64,41 GW", () => {
    expect(model.refPeakGw).toBeCloseTo(64.4059, 2);
  });

  it("Überschuss-Pool 134,2 GWh", () => {
    expect(model.surplusPoolGwh).toBeCloseTo(134.242, 1);
  });

  const cell = (strategy: "ueberschuss" | "spitze" | "markt", factor: 1 | 2 | 5 | 10) =>
    model.points.find((p) => p.strategy === strategy && p.factor === factor)!;

  it("Differenz ×1", () => {
    const p = cell("ueberschuss", 1);
    expect(p.peakAfterGw).toBeCloseTo(62.14, 2);
    expect(p.chargeGwh).toBeCloseTo(56.7, 0);
    expect(p.wirkungGw).toBeCloseTo(2.27, 2);
  });

  it("Spitze ×1", () => {
    const p = cell("spitze", 1);
    expect(p.peakAfterGw).toBeCloseTo(60.82, 2);
    expect(p.chargeGwh).toBeCloseTo(12.8, 0);
    expect(p.wirkungGw).toBeCloseTo(3.59, 2);
  });

  it("Markt ×1", () => {
    const p = cell("markt", 1);
    expect(p.peakAfterGw).toBeCloseTo(64.04, 2);
    expect(p.chargeGwh).toBeCloseTo(493.6, 0);
    expect(p.wirkungGw).toBeCloseTo(0.37, 2);
  });

  it("Markt ×10 — neue Spitze", () => {
    const p = cell("markt", 10);
    expect(p.peakAfterGw).toBeCloseTo(97.36, 2);
    expect(p.chargeGwh).toBeCloseTo(4939.7, 0);
    expect(p.wirkungGw).toBeCloseTo(-32.95, 2);
    const st = monthStatsForRun(bundle, 10, "markt");
    expect(st.chargeGwh).toBeCloseTo(p.chargeGwh, 3);
    expect(st.peakReductionGw).toBeCloseTo(p.wirkungGw, 3);
  });

  it("Spitze ×10", () => {
    const p = cell("spitze", 10);
    expect(p.peakAfterGw).toBeCloseTo(49.63, 2);
    expect(p.wirkungGw).toBeCloseTo(14.78, 2);
  });

  it("Pfadbeschriftungen wie Skizze", () => {
    const labels = arbeitPathCallouts(model);
    expect(labels.spitze).toContain("14,78");
    expect(labels.ueberschuss).toContain("Pool");
    expect(labels.markt).toMatch(/38/);
  });

  it("Summary und statsForRun stimmen überein", () => {
    for (const p of model.points) {
      const st = monthStatsForRun(bundle, p.factor, p.strategy);
      expect(st.chargeGwh).toBeCloseTo(p.chargeGwh, 4);
      expect(st.peakReductionGw).toBeCloseTo(p.wirkungGw, 4);
    }
  });
});

describe("Paket 4 Konzept C — Dauerlinie", () => {
  const bundle = loadNationalFleetMonthBundle();
  const observed = getFleetRun(bundle, 1, "ueberschuss");
  const markt10 = getFleetRun(bundle, 10, "markt");

  it("2980 Viertelstunden", () => {
    const m = buildC(observed, markt10);
    expect(m.intervalCount).toBe(2980);
    expect(m.points.length).toBe(2980);
  });

  it("beobachtete Spitze 64,41 GW", () => {
    const m = buildC(observed, null);
    expect(m.observedMaxGw).toBeCloseTo(64.4059, 2);
  });

  it("Markt ×10 Spitze und Tal", () => {
    const m = buildC(observed, markt10);
    expect(m.withStorageMaxGw).toBeCloseTo(97.36, 2);
    expect(m.withStorageMinGw).toBeCloseTo(-56.2, 1);
  });

  it("morph=1: beide Reihen monoton fallend, eigene Sortierung", () => {
    const m = buildC(observed, markt10);
    const obs = dauerlinieSeriesSamples(m, 1, "observed");
    const stor = dauerlinieSeriesSamples(m, 1, "storage");
    expect(isMonotonicNonIncreasing(obs.map((p) => p.y))).toBe(true);
    expect(isMonotonicNonIncreasing(stor.map((p) => p.y))).toBe(true);
    expect(m.observedMaxGw).toBeCloseTo(64.4059, 2);
    expect(m.observedMinGw).toBeCloseTo(-10.9, 1);
    expect(m.withStorageMaxGw).toBeCloseTo(97.36, 2);
    expect(m.withStorageMinGw).toBeCloseTo(-56.2, 1);
  });
});
