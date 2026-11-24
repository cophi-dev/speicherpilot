import bundle from "@/data/bess-netzbetreiber/bundle.json";
import { bessNetzbetreiberBundleSchema } from "@/lib/bessNetzbetreiber/schema";
import { eonSharePercent, prepareGrowthStacks, prepareVnbBars } from "@/lib/bessNetzbetreiber/prepareModel";

describe("BESS-Netzbetreiber Datenaufbereitung", () => {
  const parsed = bessNetzbetreiberBundleSchema.parse(bundle);

  it("enthält erwartete Größenordnung (≥1 MW, In Betrieb)", () => {
    expect(parsed.totalsDefault.bruttoMw / 1000).toBeGreaterThan(4);
    expect(parsed.totalsDefault.bruttoMw / 1000).toBeLessThan(5.5);
    expect(parsed.totalsDefault.bruttoMw).toBeGreaterThan(4500);
    expect(parsed.sitesDefault.length).toBeGreaterThan(400);
    const manifest = parsed.manifest as { plausibility?: { unitsGe1MwNetto?: number } };
    expect(manifest.plausibility?.unitsGe1MwNetto).toBeGreaterThanOrEqual(540);
  });

  it("führt Brutto vor Netto (Standort-Summen)", () => {
    const site = parsed.sitesDefault[0];
    expect(site.bruttoMw).toBeGreaterThanOrEqual(site.nettoMw);
  });

  it("baut VNB-Balken mit 50-MW-Marke und Rest-Summe", () => {
    const { rows, restMw, markerMw } = prepareVnbBars(parsed.vnbRanking);
    expect(markerMw).toBe(50);
    expect(rows.length).toBeLessThanOrEqual(13);
    expect(rows.every((r) => r.bruttoMw > 0)).toBe(true);
    if (parsed.vnbRanking.filter((r) => r.operatorClass !== "uenb").length > 13) {
      expect(restMw).toBeGreaterThan(0);
    }
  });

  it("liefert Wachstums-Buckets ohne ÜNB als VNB-Balken", () => {
    const stacks = prepareGrowthStacks(parsed.growthDefault, true);
    expect(stacks.some((s) => s.key === "eon_gruppe")).toBe(true);
    const eonPct = eonSharePercent(parsed.vnbRanking, true);
    expect(Number.isFinite(eonPct)).toBe(true);
  });

  it("enthält SMARD-Streuung je Bundesland", () => {
    expect(parsed.scatterBundeslaender.length).toBeGreaterThanOrEqual(16);
    expect(parsed.scatterBundeslaender.every((r) => r.eeRedispatch2025Gwh >= 0)).toBe(true);
  });
});