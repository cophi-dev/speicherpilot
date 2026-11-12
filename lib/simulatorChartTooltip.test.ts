import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";
import { deriveExampleDay } from "@/lib/simulatorFahrweisenDerived";
import { formatGw, formatMioEur } from "@/lib/simulatorFahrweisenTypes";
import {
  beispieltagTooltipRows,
  beispieltagTooltipTime,
  fnavTooltipRows,
  fnavTooltipTime,
  paretoTooltipRows,
  paretoTooltipTime,
  tagesTooltipRows,
  tagesTooltipTime,
} from "@/lib/simulatorChartTooltip";

describe("simulatorChartTooltip", () => {
  const data = loadSimulatorFahrweisen();

  it("Pareto: Werte aus den Front-Daten, 2 Dezimalstellen wie die Zoom-Achse", () => {
    const komp = data.front.find((p) => p.isEps70)!;
    const rows = paretoTooltipRows(komp);
    expect(rows[0]?.value).toBe(formatMioEur(komp.revenueMioEur, 2));
    expect(rows[1]?.value).toBe(formatGw(komp.reductionGw));
    expect(rows[2]?.value).toBe(formatGw(komp.peakGw));
    expect(paretoTooltipTime(komp)).toBe("Kompromiss ε-70");
    // nicht genauer als 2 Stellen
    expect(rows[0]?.value).toMatch(/^\d+,\d{2} Mio/);
    expect(rows[1]?.value).toMatch(/^\d+,\d{2}\u00A0GW$/);
  });

  it("Tagesstreifen: alle Kennzahlen des Tages, Anteil in ganzen Prozent wie die Achse", () => {
    const day = data.tagesklassen.find((d) => d.date === "2026-10-06")!;
    const rows = tagesTooltipRows(day);
    expect(tagesTooltipTime(day)).toBe("06.10.");
    expect(rows[0]?.label).toBe("Regel T");
    expect(rows[0]?.value).toBe(`${Math.round(day.shareOfNetzReduction * 100)}\u00A0%`);
    expect(rows[1]?.value).toBeTruthy();
    expect(rows[2]?.value).toBe(formatGw(day.marketReductionGw));
    expect(rows[3]?.value).toBe(formatGw(day.netzReductionGw));
  });

  it("Graph 3: alle Kurven zur Viertelstunde, direkt aus dem Dispatch", () => {
    const metrics = deriveExampleDay(data, "2026-10-21");
    const day = data.exampleDays["2026-10-21"]!;
    // 14:00 neue Spitze — Index über berlinHour in den Daten
    const market = day.modes.price.find((r) => r.ts.includes("14:00") || r.ts.includes("12:00:00.000Z")) ?? day.modes.price[56]!;
    const idx = day.modes.price.indexOf(market);
    const netz = day.modes.peak[idx]!;
    const komp = day.modes.eps70[idx]!;
    const rows = beispieltagTooltipRows(market, netz, komp);
    expect(rows.map((r) => r.label)).toEqual(["Beobachtet", "Max. Erlös", "Netzdienlich", "Kompromiss", "Preis"]);
    expect(rows[0]?.value).toBe(formatGw(market.residualMw / 1000));
    expect(rows[1]?.value).toBe(formatGw(market.residualPrimeMw / 1000));
    expect(rows[2]?.value).toBe(formatGw(netz.residualPrimeMw / 1000));
    expect(rows[3]?.value).toBe(formatGw(komp.residualPrimeMw / 1000));
    expect(rows[4]?.value).toMatch(/€\/MWh$/);
    expect(rows[4]?.value).not.toMatch(/,\d{2}\u00A0€/);
    expect(beispieltagTooltipTime(market)).toMatch(/^\d{2}:\d{2}$/);
    expect(metrics.marketPeakGw).toBeGreaterThan(50);
  });

  it("Graph 4: Markt- und Netz-Spitze je Faktor aus kipppunkt.factors", () => {
    const pt = data.kipppunkt.factors.find((f) => f.factor === 10)!;
    const rows = fnavTooltipRows(pt);
    expect(rows[0]?.value).toBe(formatGw(pt.marketPeakGw));
    expect(rows[1]?.value).toBe(formatGw(pt.netzPeakGw));
    expect(fnavTooltipTime(10)).toBe("×10");
    expect(fnavTooltipTime(3.9)).toBe("×3,9");
  });
});
