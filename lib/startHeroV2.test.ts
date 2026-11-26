import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { NationalFleetRunSeries } from "@/lib/nationalMonthFleetModel";
import { buildStartHeroV2 } from "@/lib/startHeroV2";

function loadDayFixture(fileName: string): NationalFleetRunSeries {
  const path = join(
    process.cwd(),
    "data/national-fleet/2026-11/days/2026-11-25",
    fileName,
  );
  return JSON.parse(readFileSync(path, "utf8")) as NationalFleetRunSeries;
}

function makeSyntheticRun(opts: {
  dayKey: string;
  rMw: number[];
  rPrimeMw?: number[];
  cMw?: number[];
  dMw?: number[];
  strategyUi: "spitze" | "ueberschuss" | "markt";
}): NationalFleetRunSeries {
  const n = opts.rMw.length;
  const timestamps = Array.from({ length: n }, (_, i) => {
    const h = String(Math.floor(i / 4)).padStart(2, "0");
    const m = String((i % 4) * 15).padStart(2, "0");
    return `${opts.dayKey}T${h}:${m}:00+01:00`;
  });
  return {
    factor: 2,
    strategySlug: opts.strategyUi,
    strategyUi: opts.strategyUi,
    sourceSha256: "",
    intervalCount: n,
    timestamp_berlin: timestamps,
    c_mw: opts.cMw ?? Array(n).fill(0),
    d_mw: opts.dMw ?? Array(n).fill(0),
    e_start_mwh: Array(n).fill(4076),
    e_end_mwh: Array(n).fill(4076),
    r_mw: opts.rMw,
    r_prime_mw: opts.rPrimeMw ?? opts.rMw,
    day_ahead_eur_mwh: Array(n).fill(100),
  };
}

describe("buildStartHeroV2", () => {
  it("rechnet für das 25.11.2026-Fixture exakt 2,9 GW (2,87 GW aus r_mw − r_prime_mw, nicht peakCutGw)", () => {
    const spitze = loadDayFixture("x2_min_peak_perfect_foresight.json");
    const ueberschuss = loadDayFixture("x2_surplus_wind_solar_over_load.json");
    const markt = loadDayFixture("x2_price_oriented_da_arbitrage.json");

    const hero = buildStartHeroV2({
      dayKey: "2026-11-25",
      spitzeRun: spitze,
      ueberschussRun: ueberschuss,
      marktRun: markt,
    });

    expect(hero.variant).toBe("peak_reduction");
    expect(hero.question).toBe("Was hätte mehr Speicher gestern geändert?");
    expect(hero.metrics.peakReductionGw).toBeCloseTo(2.8695, 3);
    expect(hero.bigNumber).toEqual({ value: "2,9", unit: "GW" });
    expect(hero.answerSentence).toBe(
      "Eine zusätzliche Flotte in heutiger Größe, gegen die Restlastspitze gefahren, hätte die Tagesspitze um 2,9\u00a0GW gesenkt.",
    );
    expect(hero.kernLine).toBe("Tagesspitze der Restlast gesenkt");
    expect(hero.contextLine).toBe(
      "54,4 auf 51,5\u00a0GW, Spitze um 15:45. Die Abendspitze (ab 17\u00a0Uhr) sank um 2,4\u00a0GW. Kein nationaler Überschuss aus Wind und Sonne. Modellschätzung, Referenzflotte 4,64\u00a0GW / 8,15\u00a0GWh, Tageshorizont.",
    );
    // Kein Euro, kein netzdienlich, kein 31 Tage
    const combined = `${hero.question} ${hero.answerSentence} ${hero.kernLine} ${hero.contextLine}`;
    expect(combined).not.toContain("€");
    expect(combined.toLowerCase()).not.toContain("netzdienlich");
    expect(combined).not.toContain("31 Tage");
  });

  it("Füllregel 1: blendet Abendspitze aus, wenn sie mit der Tagesspitze übereinstimmt, und nennt Überschuss >= 0,05 GWh sekundär", () => {
    const r = Array(96).fill(40_000);
    r[48] = -2_000; // 12:00: 0,5 GWh Überschuss
    r[72] = 52_000; // 18:00: Tages- = Abendspitze
    const rp = [...r];
    rp[72] = 50_000; // −2,0 GW sowohl Tages- als auch Abendspitze

    const hero = buildStartHeroV2({
      dayKey: "2026-11-20",
      spitzeRun: makeSyntheticRun({ dayKey: "2026-11-20", rMw: r, rPrimeMw: rp, strategyUi: "spitze" }),
    });

    expect(hero.variant).toBe("peak_reduction");
    expect(hero.bigNumber).toEqual({ value: "2,0", unit: "GW" });
    expect(hero.contextLine).toContain("52,0 auf 50,0\u00a0GW, Spitze um 18:00.");
    expect(hero.contextLine).not.toContain("Abendspitze");
    expect(hero.contextLine).toContain("Tagesüberschuss aus Wind und Sonne: 0,5\u00a0GWh.");
  });

  it("Füllregel 2: Senkung < 0,05 GW, Tagesüberschuss >= 0,05 GWh -> aufgenommene Überschussenergie (×2)", () => {
    const r = Array(96).fill(30_000);
    // 4 Viertelstunden mit je 4000 MW Überschuss = 4,0 GWh
    for (let i = 44; i < 48; i += 1) r[i] = -4_000;
    const cUeb = Array(96).fill(0);
    for (let i = 44; i < 48; i += 1) cUeb[i] = 3_600; // 3,6 GWh aufgenommen

    const hero = buildStartHeroV2({
      dayKey: "2026-11-21",
      spitzeRun: makeSyntheticRun({ dayKey: "2026-11-21", rMw: r, rPrimeMw: r, strategyUi: "spitze" }),
      ueberschussRun: makeSyntheticRun({
        dayKey: "2026-11-21",
        rMw: r,
        rPrimeMw: r,
        cMw: cUeb,
        strategyUi: "ueberschuss",
      }),
    });

    expect(hero.variant).toBe("surplus_capture");
    expect(hero.bigNumber).toEqual({ value: "3,6", unit: "GWh" });
    expect(hero.answerSentence).toBe(
      "Eine zusätzliche Flotte in heutiger Größe hätte 3,6\u00a0GWh Überschuss aus Wind und Sonne aufgenommen.",
    );
    expect(hero.answerSentence).not.toContain("gesenkt");
    expect(hero.contextLine).not.toContain("€");
  });

  it("Füllregel 3: Senkung & Überschuss < 0,05, Markt-×2 entlädt >= 0,05 GWh -> verschoben, kein 'gesenkt'", () => {
    const r = Array(96).fill(45_000);
    const dMarkt = Array(96).fill(0);
    for (let i = 68; i < 76; i += 1) dMarkt[i] = 2_000; // 4,0 GWh entladen

    const hero = buildStartHeroV2({
      dayKey: "2026-11-22",
      spitzeRun: makeSyntheticRun({ dayKey: "2026-11-22", rMw: r, rPrimeMw: r, strategyUi: "spitze" }),
      ueberschussRun: makeSyntheticRun({ dayKey: "2026-11-22", rMw: r, rPrimeMw: r, strategyUi: "ueberschuss" }),
      marktRun: makeSyntheticRun({
        dayKey: "2026-11-22",
        rMw: r,
        rPrimeMw: r,
        dMw: dMarkt,
        strategyUi: "markt",
      }),
    });

    expect(hero.variant).toBe("market_shift");
    expect(hero.bigNumber).toEqual({ value: "4,0", unit: "GWh" });
    expect(hero.answerSentence).toBe(
      "Eine zusätzliche Flotte in heutiger Größe hätte 4,0\u00a0GWh in teure Stunden verschoben, die Restlastspitze blieb.",
    );
    expect(hero.answerSentence).not.toContain("gesenkt");
    expect(hero.kernLine).not.toContain("gesenkt");
    expect(hero.contextLine).not.toContain("gesenkt");
    expect(hero.contextLine).not.toContain("€");
  });

  it("Füllregel 4: alles unter Schwelle -> kaum verändert, große Zahl nie '31 Tage'", () => {
    const r = Array(96).fill(45_000);
    const rp = Array(96).fill(44_980); // 0,02 GW < 0,05 GW

    const hero = buildStartHeroV2({
      dayKey: "2026-11-23",
      spitzeRun: makeSyntheticRun({ dayKey: "2026-11-23", rMw: r, rPrimeMw: rp, strategyUi: "spitze" }),
      ueberschussRun: makeSyntheticRun({ dayKey: "2026-11-23", rMw: r, rPrimeMw: r, strategyUi: "ueberschuss" }),
      marktRun: makeSyntheticRun({ dayKey: "2026-11-23", rMw: r, rPrimeMw: r, strategyUi: "markt" }),
    });

    expect(hero.variant).toBe("minimal_change");
    expect(hero.bigNumber).toBeNull();
    expect(hero.answerSentence).toBe(
      "Eine zusätzliche Flotte hätte die Restlastspitze an diesem Tag kaum verändert.",
    );
    expect(hero.answerSentence).not.toContain("31 Tage");
    expect(hero.contextLine).not.toContain("31 Tage");
    expect(hero.contextLine).not.toContain("€");
  });
});
