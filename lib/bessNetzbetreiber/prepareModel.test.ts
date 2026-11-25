import bundle from "@/data/bess-netzbetreiber/bundle.json";
import { bessNetzbetreiberBundleSchema } from "@/lib/bessNetzbetreiber/schema";
import {
  eonSharePercent,
  GROWTH_DISJOINT_STACK_KEYS,
  prepareGrowthStacks,
  prepareVnbBars,
  sumGrowthDisjointMw,
} from "@/lib/bessNetzbetreiber/prepareModel";

describe("BESS-Netzbetreiber Datenaufbereitung", () => {
  const parsed = bessNetzbetreiberBundleSchema.parse(bundle);
  const hs = parsed.headlineStats!;

  it("enthält erwartete Größenordnung (≥1 MW, In Betrieb)", () => {
    expect(parsed.totalsDefault.bruttoMw / 1000).toBeGreaterThan(4);
    expect(parsed.totalsDefault.bruttoMw / 1000).toBeLessThan(5.5);
    expect(parsed.totalsDefault.bruttoMw).toBeGreaterThan(4500);
    expect(parsed.sitesDefault.length).toBeGreaterThan(400);
    const manifest = parsed.manifest as { plausibility?: { unitsGe1MwNetto?: number } };
    expect(manifest.plausibility?.unitsGe1MwNetto).toBeGreaterThanOrEqual(570);
    expect(manifest.plausibility?.unitsGe1MwNetto).toBeLessThanOrEqual(580);
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

  it("liefert disjunkte Wachstums-Buckets inkl. MITNETZ-Zeile", () => {
    const stacks = prepareGrowthStacks(parsed.growthDefault, { showMitnetz: true });
    expect(stacks.some((s) => s.key === "eon_kern")).toBe(true);
    const mitnetz = stacks.find((s) => s.key === "mitnetz_envia");
    expect(mitnetz).toBeDefined();
    expect(stacks.some((s) => s.key === "eon_gruppe")).toBe(false);
    const eonPct = eonSharePercent(parsed.vnbRanking, true);
    expect(eonPct).toBeGreaterThan(50);
  });

  it("G3-Teilsummen = Gesamt-Zubau 2026 und eon_gruppe = eon_kern + mitnetz", () => {
    const g = parsed.growthDefault;
    const yParts = sumGrowthDisjointMw(g, "y2026Mw");
    expect(yParts).toBeCloseTo(hs.zubau2026.allBruttoMw, 0);
    expect(g.eon_gruppe!.y2026Mw).toBeCloseTo(g.eon_kern!.y2026Mw + g.mitnetz_envia!.y2026Mw, 1);
    expect(g.eon_gruppe!.vor2026Mw).toBeCloseTo(g.eon_kern!.vor2026Mw + g.mitnetz_envia!.vor2026Mw, 1);
    expect(g.eon_kern!.y2026Mw).toBeCloseTo(hs.zubau2026.eonWithoutMitnetzBruttoMw, 0);
    expect(g.eon_gruppe!.y2026Mw).toBeCloseTo(hs.zubau2026.eonWithMitnetzBruttoMw, 0);
  });

  it("G3-Stapel sind netto (Zubau 2026 = 2,05 GW, E.ON 1,38 GW)", () => {
    const stacks = prepareGrowthStacks(parsed.growthDefault, { showMitnetz: true });
    const y = stacks.reduce((s, r) => s + r.y2026Mw, 0);
    expect(y / 1000).toBeCloseTo(2.05, 2);
    const eon = stacks.filter((r) => r.key === "eon_kern" || r.key === "mitnetz_envia").reduce((s, r) => s + r.y2026Mw, 0);
    expect(eon / 1000).toBeCloseTo(1.38, 2);
  });

  it("growthEonKern nutzt dieselben disjunkten Schlüssel (kein vertauschter eon_gruppe-Inhalt)", () => {
    const g = parsed.growthEonKern!;
    for (const key of GROWTH_DISJOINT_STACK_KEYS) {
      expect(parsed.growthDefault[key]?.y2026Mw).toBeCloseTo(g[key]!.y2026Mw, 3);
    }
    expect(g.eon_kern!.y2026Mw).toBeGreaterThan(900);
    expect(g.mitnetz_envia!.y2026Mw).toBeCloseTo(454.3, 0);
    expect(g.eon_gruppe!.y2026Mw).not.toBeCloseTo(g.mitnetz_envia!.y2026Mw, 0);
  });

  it("EE-Redispatch je Land nach BMWE 12.05.2026 ohne Wind Offshore (14 Länder, 6.036,02 von 9.387,08 GWh, HH/BE k. A.)", () => {
    const rows = parsed.scatterBundeslaender;
    expect(rows.length).toBe(16);
    const known = rows.filter((r) => r.eeRedispatch2025Gwh !== null);
    expect(known).toHaveLength(14);
    const sum = known.reduce((s, r) => s + (r.eeRedispatch2025Gwh ?? 0), 0);
    expect(sum).toBeCloseTo(6036.02, 1);
    const gesamt = rows.reduce((s, r) => s + (r.eeRedispatch2025GesamtGwh ?? 0), 0);
    expect(gesamt).toBeCloseTo(9387.08, 1);
    const ka = rows.filter((r) => r.eeRedispatch2025Gwh === null).map((r) => r.bundesland).sort();
    expect(ka).toEqual(["Berlin", "Hamburg"]);
    const maxBess = Math.max(...parsed.scatterBundeslaender.map((r) => r.bessBruttoGw));
    expect(maxBess).toBeLessThan(3);
    expect(maxBess).toBeGreaterThan(0.1);
  });
});