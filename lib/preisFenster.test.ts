import { berlinDayPrices, computeDauerSpanne, dryDayFootnote, fleetQuarterCount, preisFigurSatz } from "@/lib/preisFenster";

/** Published DE-LU quarter-hours, 8 November 2026, Energy-Charts / SMARD. */
const NOV8_LOW = [
  { hm: "10:30", eurPerMwh: 208.46 },
  { hm: "13:30", eurPerMwh: 208.11 },
  { hm: "13:45", eurPerMwh: 208.24 },
  { hm: "14:00", eurPerMwh: 207.18 },
  { hm: "15:00", eurPerMwh: 206.09 },
];
const NOV8_HIGH = [
  { hm: "17:45", eurPerMwh: 321.5 },
  { hm: "18:30", eurPerMwh: 319.69 },
  { hm: "18:45", eurPerMwh: 318.15 },
  { hm: "19:30", eurPerMwh: 319.93 },
  { hm: "20:00", eurPerMwh: 320 },
];

function nov8Series() {
  const filler = { hm: "12:00", eurPerMwh: 250 };
  return [...NOV8_LOW, ...NOV8_HIGH, filler, { hm: "00:00", eurPerMwh: 251.92 }, { hm: "23:45", eurPerMwh: 215.97 }];
}

describe("Dauer-Spanne", () => {
  it("uses five quarter-hours for the live fleet 4.64 GW / 8.14 GWh", () => {
    expect(fleetQuarterCount(4.64, 8.14)).toBe(5);
    const result = computeDauerSpanne(nov8Series(), 4.64, 8.14);
    expect(result).not.toBeNull();
    expect(result?.n).toBe(5);
    expect(result?.meanLow).toBeCloseTo(207.616, 3);
    expect(result?.meanHigh).toBeCloseTo(319.854, 3);
    expect(result?.dauerSpanne).toBeCloseTo(112.238, 3);
    expect(result?.reihenfolge).toBe(true);
    expect(result?.low.map((row) => row.hm)).toEqual(["10:30", "13:30", "13:45", "14:00", "15:00"]);
    expect(result?.high.map((row) => row.eurPerMwh)).toEqual([321.5, 319.69, 318.15, 319.93, 320]);
  });

  it("says the cheap hours are not a block before the dear hours", () => {
    const points = [
      { hm: "08:00", eurPerMwh: 400 },
      { hm: "08:15", eurPerMwh: 390 },
      { hm: "14:00", eurPerMwh: 10 },
      { hm: "14:15", eurPerMwh: 12 },
    ];
    expect(fleetQuarterCount(4.64, 8.14)).toBe(5);
    const result = computeDauerSpanne(points, 4.64, 8.14);
    expect(result).toBeNull();
    const shorter = computeDauerSpanne(points, 1, 0.4);
    expect(shorter?.n).toBe(1);
    expect(shorter?.reihenfolge).toBe(false);
    expect(shorter?.dauerSpanne).toBeCloseTo(390, 5);
  });

  it("keeps the earlier quarter when two prices tie", () => {
    const points = [
      { hm: "10:00", eurPerMwh: 10 },
      { hm: "11:00", eurPerMwh: 10 },
      { hm: "18:00", eurPerMwh: 40 },
      { hm: "19:00", eurPerMwh: 40 },
    ];
    const result = computeDauerSpanne(points, 2, 1);
    expect(result?.n).toBe(1);
    expect(result?.low[0]?.hm).toBe("10:00");
    expect(result?.high[0]?.hm).toBe("19:00");
  });
});

describe("Preis-Sätze", () => {
  it("names the exchange range on a dry day and does not call it revenue", () => {
    const text = dryDayFootnote("08.11.2026", { pmin: 206.09, pmax: 321.5, negH: 0 });
    expect(text).toBe(
      "Gestern (08.11.2026) ohne Überschuss zum Laden. Börse 206–322 €/MWh, keine Viertelstunde unter null.",
    );
    expect(text).not.toMatch(/Modellschätzung|Erlös/);
  });

  it("counts negative hours when they exist", () => {
    const text = dryDayFootnote("25.10.2026", { pmin: -0.01, pmax: 71.61, negH: 1.5 });
    expect(text).toMatch(/1,5 Stunden unter null/);
  });

  it("states the duration gap with the hand-check digits", () => {
    const dauer = computeDauerSpanne(nov8Series(), 4.64, 8.14);
    const satz = preisFigurSatz({ surplusGwh: 0, dauer });
    expect(satz).toMatch(/lädt an diesem Tag nicht/);
    expect(satz).toMatch(/Dauer-Spanne 112,24 €\/MWh/);
    expect(satz).toMatch(/Kein Erlös/);
    expect(satz).toMatch(/liegen vor den teuren/);
  });
});

describe("berlinDayPrices", () => {
  it("keeps one Berlin day", () => {
    const points = berlinDayPrices(
      [
        { unixMs: Date.parse("2026-11-08T14:00:00+01:00"), eurPerMwh: 207.18 },
        { unixMs: Date.parse("2026-11-09T00:00:00+01:00"), eurPerMwh: 1 },
      ],
      "2026-11-08",
    );
    expect(points).toEqual([{ hm: "14:00", eurPerMwh: 207.18 }]);
  });
});
