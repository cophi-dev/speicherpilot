import { buildLiveReadings } from "@/lib/liveStrip";
import type { PowerSlot } from "@/lib/powerMix";
import { CARRIER_IDS } from "@/lib/powerMix";

function slot(iso: string, patch: Partial<PowerSlot> & { loadMw?: number | null; solar?: number | null; wind?: number | null }): PowerSlot {
  const carriers = Object.fromEntries(CARRIER_IDS.map((id) => [id, null])) as PowerSlot["carriers"];
  carriers.windOnshore = patch.wind === undefined ? 1_000 : patch.wind;
  carriers.windOffshore = patch.wind === undefined ? 1_000 : patch.wind;
  carriers.solar = patch.solar === undefined ? 0 : patch.solar;
  return {
    unixSeconds: Math.floor(Date.parse(iso) / 1000),
    timestampIso: new Date(iso).toISOString(),
    dateBerlin: "2026-10-28",
    hourBerlin: 7,
    minuteBerlin: 30,
    carriers,
    loadMw: patch.loadMw === undefined ? 50_000 : patch.loadMw,
    tradeMw: null,
    renewableSharePct: 30,
  };
}

describe("live strip", () => {
  it("never prints a missing generation value as zero", () => {
    const readings = buildLiveReadings({
      slots: [
        slot("2026-10-28T08:15:00+01:00", { loadMw: 65_700 }),
        slot("2026-10-28T08:30:00+01:00", { wind: null, solar: null, loadMw: 72_600 }),
      ],
      offshorePresent: true,
      powerStale: false,
      prices: [],
      priceStale: false,
      frequency: null,
      frequencyStale: false,
      now: new Date("2026-10-28T08:00:00+01:00"),
    });
    const wind = readings.readings.find((reading) => reading.id === "wind");
    const solar = readings.readings.find((reading) => reading.id === "solar");
    const load = readings.readings.find((reading) => reading.id === "load");
    const frequency = readings.readings.find((reading) => reading.id === "frequency");
    expect(load?.value).toBeCloseTo(65.7, 1);
    expect(load?.provisional).toBe(true);
    expect(load?.value).not.toBeCloseTo(72.6, 1);
    expect(wind?.value).toBeCloseTo(2, 5);
    expect(wind?.value).not.toBe(0);
    expect(solar?.value).toBe(0);
    expect(frequency?.value).toBeNull();
    expect(readings.stand).toBe("08:00");
  });

  it("marks the previous value when the price request failed", () => {
    const readings = buildLiveReadings({
      slots: [],
      offshorePresent: true,
      powerStale: true,
      prices: [{ unixMs: Date.parse("2026-10-28T08:00:00+01:00"), eurPerMwh: 80 }],
      priceStale: true,
      frequency: { unixMs: Date.parse("2026-10-28T07:30:00Z"), hertz: 50.01 },
      frequencyStale: true,
      now: new Date("2026-10-28T08:05:00+01:00"),
    });
    expect(readings.readings.find((reading) => reading.id === "price")).toMatchObject({ value: 80, stale: true });
    expect(readings.readings.find((reading) => reading.id === "frequency")?.stale).toBe(true);
    expect(readings.readings.find((reading) => reading.id === "load")?.value).toBeNull();
  });
});
