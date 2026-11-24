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
    expect(h.zubau2026EonGw).toBeGreaterThan(1.38);
    expect(h.zubau2026EonGw).toBeLessThan(1.45);
    expect(h.zubau2026EonSharePct).toBeGreaterThanOrEqual(66);
    expect(h.zubau2026EonSharePct).toBeLessThanOrEqual(68);
  });

  it("E.ON ohne MITNETZ deutlich kleiner", () => {
    const withM = computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz: true });
    const ohne = computeNetzbetreiberHeadlines(model, { eonIncludeMitnetz: false });
    expect(ohne.eonBruttoGw).toBeLessThan(withM.eonBruttoGw - 0.7);
    expect(ohne.eonBruttoGw).toBeGreaterThan(1.95);
    expect(ohne.eonBruttoGw).toBeLessThan(2.05);
  });

  it("SNB916269213931 gehört zum E.ON-Konzern", () => {
    expect(snbMapsToEonKonzern("SNB916269213931")).toBe(true);
  });
});