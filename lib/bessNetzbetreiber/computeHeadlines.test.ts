import bundle from "@/data/bess-netzbetreiber/bundle.json";
import { bessNetzbetreiberBundleSchema } from "@/lib/bessNetzbetreiber/schema";
import { computeNetzbetreiberHeadlines, snbMapsToEonKonzern } from "@/lib/bessNetzbetreiber/computeHeadlines";

describe("computeNetzbetreiberHeadlines", () => {
  const model = bessNetzbetreiberBundleSchema.parse(bundle);

  it("liefert Konzept-Kopfzahlen (~575 Einheiten, ~4,74 GW)", () => {
    const h = computeNetzbetreiberHeadlines(model);
    expect(h.units).toBeGreaterThanOrEqual(570);
    expect(h.bruttoGw).toBeGreaterThan(4.6);
    expect(h.bruttoGw).toBeLessThan(4.85);
  });

  it("E.ON inkl. MITNETZ aus headlineStats (~2.755 GW, ~58 %)", () => {
    const h = computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz: true });
    expect(h.eonBruttoGw).toBeGreaterThan(2.7);
    expect(h.eonBruttoGw).toBeLessThan(2.82);
    expect(h.eonSharePctTotal).toBeGreaterThanOrEqual(57);
    expect(h.eonSharePctTotal).toBeLessThanOrEqual(59);
    // Zubau 2026 netto (speicherpilot-Fachprüfung 25.11): 2,05 GW, davon 1,38 GW E.ON (67 %)
    expect(h.zubau2026Gw).toBeCloseTo(2.05, 2);
    expect(h.zubau2026EonGw).toBeCloseTo(1.38, 2);
    expect(Math.round(h.zubau2026EonSharePct)).toBe(67);
    expect(h.zubau2026BruttoGw).toBeCloseTo(2.08, 2);
    expect(h.zubau2026EonBruttoGw).toBeCloseTo(1.41, 2);
  });

  it("E.ON ohne MITNETZ deutlich kleiner", () => {
    const withM = computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz: true });
    const ohne = computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz: false });
    expect(ohne.eonBruttoGw).toBeLessThan(withM.eonBruttoGw - 0.7);
    expect(ohne.eonBruttoGw).toBeGreaterThan(1.95);
    expect(ohne.eonBruttoGw).toBeLessThan(2.05);
  });

  it("liefert Netto-Kopfzahlen (~4,62 GW gesamt, E.ON netto inkl./ohne MITNETZ)", () => {
    const withM = computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz: true });
    const ohne = computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz: false });
    expect(withM.nettoGw).toBeCloseTo(4.62, 2);
    expect(withM.eonNettoGw).toBeCloseTo(2.6833, 3);
    expect(withM.eonSharePctTotalNetto).toBeGreaterThanOrEqual(57.5);
    expect(withM.eonSharePctTotalNetto).toBeLessThanOrEqual(58.6);
    expect(ohne.eonNettoGw).toBeCloseTo(1.9598, 3);
    expect(ohne.eonSharePctTotalNetto).toBeGreaterThanOrEqual(42);
    expect(ohne.eonSharePctTotalNetto).toBeLessThanOrEqual(43);
  });

  it("SNB916269213931 gehört zum E.ON-Konzern", () => {
    expect(snbMapsToEonKonzern("SNB916269213931")).toBe(true);
  });
});