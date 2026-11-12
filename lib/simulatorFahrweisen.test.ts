import { buildMonatV1Model } from "@/lib/monatV1Model";
import { monthStatsForRun } from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { loadSimulatorFahrweisen } from "@/lib/simulatorFahrweisen.server";
import {
  deriveExampleDay,
  dayRevenueEur,
  formatDec,
  fullReduction,
  compromisePct,
} from "@/lib/simulatorFahrweisenDerived";
import { formatGw, formatMioEur, formatPct, pctOfMarket } from "@/lib/simulatorFahrweisenTypes";

describe("Simulator Fahrweisen Daten", () => {
  const data = loadSimulatorFahrweisen();

  it("Front hat 18 Punkte, Default ε-70", () => {
    expect(data.front).toHaveLength(18);
    expect(data.defaultIndex).toBe(data.namedIndices.kompromiss);
    expect(data.front[data.defaultIndex]!.isEps70).toBe(true);
  });

  it("Kernzahlen ×2 (Modellschätzung)", () => {
    expect(data.endpoints.marketLex.revenueMioEur).toBeCloseTo(34.09, 2);
    expect(data.endpoints.marketLex.reductionGw).toBeCloseTo(0.37, 2);
    expect(data.endpoints.netzLex.reductionGw).toBeCloseTo(3.59, 2);
    expect(data.endpoints.eps70.revenueMioEur).toBeCloseTo(33.97, 2);
    expect(data.endpoints.eps70.reductionGw).toBeCloseTo(2.51, 2);
  });

  it("Konsistenz mit Monat-v1-Tabelle ×2 Markt-Spitze", () => {
    const bundle = loadNationalFleetMonthBundle();
    const model = buildMonatV1Model(bundle);
    const mk2 = monthStatsForRun(bundle, 2, "markt");
    const spitze2 = model.hero.points.find((p) => p.factor === 2)!;
    expect(spitze2.marktGw).toBeCloseTo(mk2.peakAfterGw, 3);
    expect(data.endpoints.marketLex.peakGw).toBeCloseTo(mk2.peakAfterGw, 2);
  });

  it("Tagesklassen: 0 Win-win", () => {
    expect(data.tagesklassenSummary.winWin).toBe(0);
    expect(data.tagesklassen).toHaveLength(31);
    expect(data.tagesklassenSummary.neutral).toBe(18);
    expect(data.tagesklassenSummary.konfliktSchwach).toBe(11);
    expect(data.tagesklassenSummary.konfliktHebung).toBe(2);
  });

  it("Kipppunkt analytisch 64 428 MW", () => {
    expect(data.kipppunkt.analyticalMw).toBe(64428);
    const f39 = data.kipppunkt.factors.find((f) => f.factor === 3.9)!;
    expect(f39.marketPeakGw).toBeCloseTo(64.43, 2);
    const f10 = data.kipppunkt.factors.find((f) => f.factor === 10)!;
    expect(f10.marketPeakGw).toBeCloseTo(92.76, 2);
    expect(f10.netzPeakGw).toBeCloseTo(50.43, 2);
    expect(formatGw(f10.marketPeakGw)).toBe("92,76\u00A0GW");
    expect(formatGw(f10.netzPeakGw)).toBe("50,43\u00A0GW");
  });

  it("exampleDays 21.10. und 29.10. liegen vor (je 96 Viertelstunden, 3 Fahrpläne)", () => {
    for (const date of ["2026-10-21", "2026-10-29"] as const) {
      const day = data.exampleDays[date];
      expect(day).toBeDefined();
      expect(day!.modes.price).toHaveLength(96);
      expect(day!.modes.peak).toHaveLength(96);
      expect(day!.modes.eps70).toHaveLength(96);
    }
  });
});

describe("Volle Senkung: 0,89 % aus ungerundetem Quotienten, zweiter Rechenweg in Euro", () => {
  const data = loadSimulatorFahrweisen();
  const mkt = data.endpoints.marketLex.revenueMioEur;
  const net = data.endpoints.netzLex.revenueMioEur;
  const voll = fullReduction(mkt, net);

  it("Anzeige 0,30 Mio. €, 34,09 Mio. €, 0,89 % — identisch in allen Formaten", () => {
    expect(voll.costMioLabel).toBe("0,30");
    expect(voll.marketMioLabel).toBe("34,09");
    expect(voll.pctLabel).toBe("0,89");
    expect(voll.costMioEurText).toBe("0,30 Mio.\u00A0€");
    expect(voll.fullCostSentence).toBe("volle Senkung kostet 0,30 Mio.\u00A0€ (0,89\u00A0%)");
    expect(voll.vonLabel).toBe("0,30 von 34,09");
    expect(formatMioEur(mkt)).toBe("34,09 Mio.\u00A0€");
    expect(formatPct(voll.exactPct)).toBe("0,89\u00A0%");
  });

  it("zweiter Rechenweg: Euro-Quotient 303 639 / 34 089 906 ergibt dieselbe 0,89 %", () => {
    expect(voll.exactEur).toBeCloseTo(303_638.75, 2);
    expect(voll.pctFromEur).toBeCloseTo(voll.exactPct, 12);
    expect(formatDec(voll.pctFromEur, 2)).toBe("0,89");
    expect(formatDec((voll.exactEur / voll.marketEur) * 100, 2)).toBe(voll.pctLabel);
  });

  it("bereits gerundete Anzeige 0,30/34,09 ergibt 0,88 % — Rundungsartefakt, nicht verwendet", () => {
    expect(voll.pctFromRoundedDisplay).toBeCloseTo(0.88, 2);
    expect(formatDec(voll.pctFromRoundedDisplay, 2)).toBe("0,88");
    expect(voll.pctLabel).not.toBe("0,88");
  });
});

describe("Kompromiss ε-70 Prozent (0,36 % / 99,64 %)", () => {
  const data = loadSimulatorFahrweisen();
  const mkt = data.endpoints.marketLex.revenueMioEur;
  const e70 = data.endpoints.eps70.revenueMioEur;
  const k = compromisePct(mkt, e70);

  it("beide Rechenwege (Kosten und 100−Anteil) ergeben 0,36 %", () => {
    expect(k.costLabel).toBe("0,36");
    expect(k.keepLabel).toBe("99,64");
    expect(formatDec(100 - k.keepPct, 2)).toBe("0,36");
    expect(pctOfMarket(e70, mkt)).toBe("99,64\u00A0%");
  });
});

describe("Beispieltage aus Dispatch, nicht händisch gesetzt", () => {
  const data = loadSimulatorFahrweisen();
  const d21 = deriveExampleDay(data, "2026-10-21");
  const d29 = deriveExampleDay(data, "2026-10-29");

  it("21.10.: neue Spitze 55,60 GW um 14:00, beobachtet 54,30 um 18:30, Netzdienlich 51,68, Hebung 1,31", () => {
    expect(formatGw(d21.marketPeakGw)).toBe("55,60\u00A0GW");
    expect(d21.marketPeakLabel).toBe("14:00");
    expect(formatGw(d21.observedPeakGw)).toBe("54,30\u00A0GW");
    expect(d21.observedLabel).toBe("18:30");
    expect(formatGw(d21.netzPeakGw)).toBe("51,68\u00A0GW");
    expect(formatGw(d21.hebungGw)).toBe("1,31\u00A0GW");
    expect(formatGw(d21.marketChargeAtPeakGw)).toBe("4,64\u00A0GW");
    expect(formatDec(d21.marketPriceAtPeak, 2)).toBe("201,29");
  });

  it("21.10. Tages-Kompromiss 13 % (0,56 statt 0,65 Mio. €) — zwei Rechenwege", () => {
    expect(formatMioEur(d21.marketDayRevMio)).toBe("0,65 Mio.\u00A0€");
    expect(formatMioEur(d21.kompDayRevMio)).toBe("0,56 Mio.\u00A0€");
    const exact = ((d21.marketDayRevMio - d21.kompDayRevMio) / d21.marketDayRevMio) * 100;
    expect(Math.round(exact)).toBe(13);
    expect(Math.round(d21.kompDayCostPct)).toBe(13);
    const fromEur =
      ((dayRevenueEur(data.exampleDays["2026-10-21"]!.modes.price) -
        dayRevenueEur(data.exampleDays["2026-10-21"]!.modes.eps70)) /
        dayRevenueEur(data.exampleDays["2026-10-21"]!.modes.price)) *
      100;
    expect(Math.round(fromEur)).toBe(13);
  });

  it("29.10.: Restlast 64,41 GW um 18:15, Preis 574 € um 17:15, Markt 0,83 GW übrig, Netzdienlich 60,82", () => {
    expect(formatGw(d29.observedPeakGw)).toBe("64,41\u00A0GW");
    expect(d29.observedLabel).toBe("18:15");
    expect(formatDec(d29.maxPrice, 2)).toBe("574,28");
    expect(formatDec(d29.maxPrice, 0)).toBe("574");
    expect(d29.maxPriceLabel).toBe("17:15");
    expect(formatGw(d29.marketDischargeAtObservedGw)).toBe("0,83\u00A0GW");
    expect(formatGw(d29.netzPeakGw)).toBe("60,82\u00A0GW");
    expect(formatMioEur(d29.marketDayRevMio)).toBe("2,11 Mio.\u00A0€");
    expect(formatDec(d29.priceAtObserved, 0)).toBe("471");
  });

  it("beide Tage haben dieselbe beobachtete Monatsspitzen-Referenz 64,41 (Baseline)", () => {
    expect(formatDec(data.baselinePeakGw)).toBe("64,41");
  });
});
