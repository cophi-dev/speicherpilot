import { LIVE_PRICE_CONFIG, alignLatest, assessDayAheadPrices, buildLiveBoard, currentSignal } from "@/lib/liveBoard";

const nine = Date.parse("2026-10-21T09:00:00+02:00");
const nineFifteen = Date.parse("2026-10-21T09:15:00+02:00");

describe("live board geography and readings", () => {
  it("keeps the latest quarter-hour only when every series has a number", () => {
    const aligned = alignLatest(
      {
        load: [
          { unixMs: nine, value: 1000 },
          { unixMs: nineFifteen, value: 1100 },
        ],
        wind: [
          { unixMs: nine, value: 400 },
          { unixMs: nineFifteen, value: null },
        ],
      },
      ["load", "wind"]
    );
    expect(aligned?.unixMs).toBe(nine);
    expect(aligned?.values.wind).toBe(400);
  });

  it("labels 50Hertz as the control area and DE-LU as the bidding zone", () => {
    const board = buildLiveBoard({
      berlinDateKey: "2026-10-21",
      nowMs: Date.parse("2026-10-21T09:30:00+02:00"),
      hertz: {
        windOn: [{ unixMs: nine, value: 488.12 }],
        windOff: [{ unixMs: nine, value: 260.82 }],
        pv: [{ unixMs: nine, value: 218.92 }],
        load: [{ unixMs: nine, value: 3247.15 }],
      },
      offshore: {
        hertz: [{ unixMs: nine, value: 260.82 }],
        tennet: [{ unixMs: nine, value: 1354.54 }],
      },
      transnet: {
        windOn: [{ unixMs: nine, value: 27.83 }],
        pv: [{ unixMs: nine, value: 49.17 }],
        load: [{ unixMs: nine, value: 2142.75 }],
      },
      prices: [
        { unixMs: Date.parse("2026-10-21T08:00:00+02:00"), eurPerMwh: 279.61 },
        { unixMs: Date.parse("2026-10-21T23:45:00+02:00"), eurPerMwh: 152.81 },
      ],
      signal: [{ unixMs: nine, sharePct: 33.2, signal: 0 }],
      germany: { unixMs: nine, loadMw: 60_000, generationMw: 55_000 },
    });

    const hertz = board.modules.find((module) => module.id === "hertz");
    const price = board.modules.find((module) => module.id === "price");
    const zones = board.modules.find((module) => module.id === "zones");
    expect(hertz?.level.de).toBe("Regelzone 50Hertz");
    expect(hertz?.sentence.de).toContain("nicht für die Stadt");
    expect(hertz?.sentence.de).toContain("30 %");
    expect(price?.level.de).toBe("Gebotszone DE-LU");
    expect(price?.sentence.de).toContain("kein Viertelstundenpreis");
    expect(price?.sentence.de).toContain("152,81");
    expect(price?.sentence.de).toContain("279,61");
    expect(zones?.level.de).toContain("TransnetBW");
    expect(zones?.sentence.de).toContain("kein Engpass");
    expect(board.priceLight).toBe("yellow");
    expect(board.lead.de).toContain("Gebotszone DE-LU");
    const blob = JSON.stringify(board);
    expect(blob).not.toContain("Regelzone Hamburg");
    expect(blob).not.toContain("Norddeutschland hat");
  });

  it("does not invent a German deficit when generation is missing", () => {
    const board = buildLiveBoard({
      berlinDateKey: "2026-10-21",
      nowMs: nine,
      hertz: null,
      offshore: null,
      transnet: null,
      prices: null,
      signal: null,
      germany: { unixMs: nine, loadMw: 50_000, generationMw: null },
    });
    const germany = board.modules.find((module) => module.id === "germany");
    expect(germany?.available).toBe(false);
    expect(germany?.sentence.de).toContain("keine gemeinsame");
    expect(germany?.sentence.de).not.toContain("kurz");
    expect(germany?.value).toBeNull();
  });

  it("marks a negative day-ahead quarter-hour green and leads with it", () => {
    const reading = assessDayAheadPrices([
      { unixMs: nine, eurPerMwh: -12.5 },
      { unixMs: nineFifteen, eurPerMwh: 80 },
    ]);
    expect(reading?.light).toBe("green");
    expect(reading?.negativeQuarterHours).toBe(1);
    const board = buildLiveBoard({
      berlinDateKey: "2026-10-21",
      nowMs: nineFifteen,
      hertz: null,
      offshore: null,
      transnet: null,
      prices: [
        { unixMs: nine, eurPerMwh: -12.5 },
        { unixMs: nineFifteen, eurPerMwh: 80 },
      ],
      signal: null,
      germany: null,
    });
    expect(board.lead.de).toContain("unter null");
    expect(board.priceLight).toBe("green");
  });

  it("uses the yellow band only at the configured spread", () => {
    const tight = assessDayAheadPrices([
      { unixMs: nine, eurPerMwh: 100 },
      { unixMs: nineFifteen, eurPerMwh: 100 + LIVE_PRICE_CONFIG.spreadYellowEurPerMwh - 1 },
    ]);
    const wide = assessDayAheadPrices([
      { unixMs: nine, eurPerMwh: 100 },
      { unixMs: nineFifteen, eurPerMwh: 100 + LIVE_PRICE_CONFIG.spreadYellowEurPerMwh },
    ]);
    expect(tight?.light).toBe("red");
    expect(wide?.light).toBe("yellow");
  });

  it("reads the Energy-Charts signal as Germany and ignores later forecast hours", () => {
    const reading = currentSignal(
      [
        { unixMs: nine, sharePct: 33, signal: 0 },
        { unixMs: nineFifteen, sharePct: 80, signal: 2 },
      ],
      nine + 60_000
    );
    expect(reading?.signal).toBe(0);
    expect(reading?.sharePct).toBe(33);
  });
});
