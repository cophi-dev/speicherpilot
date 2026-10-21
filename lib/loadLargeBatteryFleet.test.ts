import { fleetSizeLabel, formatSignedGw, onceRoundDeltaGw } from "@/lib/dayRingStory";
import { FLEET_SNAPSHOT_MAX_AGE_MS, readFleetSnapshot } from "@/lib/fleetSnapshot";
import fixture from "@/lib/fixtures/residual-2026-10-11-20.json";
import { buildLiveDispatchStory } from "@/lib/liveFleetDispatch";
import { clearLargeBatteryFleetCache, loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import type { ResidualDay } from "@/lib/windSolarResidual";

jest.mock("server-only", () => ({}));

const days = fixture as ResidualDay[];
const STAND = new Date("2026-10-21T18:00:00Z");

type FetchResult = { ok: boolean; status: number; json: () => Promise<unknown> };

function jsonResult(body: unknown, status = 200): FetchResult {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function energyChartsPayload() {
  return [
    {
      name: [{ de: "Große Batteriespeicher (Leistung)", en: "Large battery storage (power)" }],
      data: [4.592],
      xAxisValues: [2026],
      date: [Date.parse("2026-10-16T12:00:00Z")],
      datasource: "Bundesnetzagentur",
    },
    {
      name: [{ de: "Große Batteriespeicher (Kapazität)", en: "Large battery storage (capacity)" }],
      data: [8.055],
    },
  ];
}

describe("loadLargeBatteryFleet", () => {
  const calls: string[] = [];
  let batteryCharts: "fail" | "live";

  beforeEach(() => {
    clearLargeBatteryFleetCache();
    calls.length = 0;
    batteryCharts = "fail";
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("battery-charts.de")) {
        if (batteryCharts === "fail") {
          throw new Error("ECONNRESET");
        }
        const power = url.includes("bess_monthly_power");
        return jsonResult([
          {
            date: "2026-10-22 00:00:00",
            grossspeicher: power ? 5_000_000 : 9_000_000,
          },
        ]);
      }
      if (url.includes("energy-charts.info")) {
        return jsonResult(energyChartsPayload());
      }
      throw new Error(`unexpected ${url}`);
    }) as typeof fetch;
  });

  it("shows 4,5 GW / 7,9 GWh / −4,5 from the snapshot when Battery Charts fails", async () => {
    const fleet = await loadLargeBatteryFleet(STAND);
    const day = days.find((entry) => entry.dateBerlin === "2026-10-11");
    if (!fleet || !day) {
      throw new Error("snapshot fleet or 11 October day missing");
    }

    const story = buildLiveDispatchStory({
      day,
      fallback: true,
      powerMw: fleet.powerGw * 1000,
      energyMwh: fleet.energyGwh * 1000,
      factor: 1,
    });
    const before = story.eveningPeakBeforeGw;
    const after = story.eveningPeakAfterGw;
    if (before === null || after === null) {
      throw new Error("evening peak missing");
    }

    expect(fleet.source).toBe("battery-charts");
    expect(fleet.updatedLabel.de).toBe("21. Oktober 2026");
    expect(fleet.powerGw).toBeCloseTo(4.51554022, 5);
    expect(fleet.energyGwh).toBeCloseTo(7.86001657, 5);
    expect(fleetSizeLabel(1, story.powerMw, story.energyMwh, "de")).toBe("×1 = 4,5 GW · 7,9 GWh");
    expect(formatSignedGw(-onceRoundDeltaGw(before, after), "de")).toBe("−4,5");
    expect(calls.some((url) => url.includes("energy-charts.info"))).toBe(false);
    expect(fleet.source === "energy-charts" ? ". Battery Charts ist gerade nicht geladen." : "").toBe("");
  });

  it("keeps the snapshot on the 30-day boundary and uses Energy-Charts only after that", async () => {
    const current = readFleetSnapshot(STAND);
    if (!current) {
      throw new Error("snapshot missing");
    }
    const atLimit = new Date(Date.parse(current.updatedAtIso) + FLEET_SNAPSHOT_MAX_AGE_MS);
    const justOver = new Date(atLimit.getTime() + 1);

    const stillCurrent = await loadLargeBatteryFleet(atLimit);
    expect(stillCurrent?.source).toBe("battery-charts");
    expect(stillCurrent?.updatedLabel.de).toBe("21. Oktober 2026");
    expect(calls.some((url) => url.includes("energy-charts.info"))).toBe(false);

    clearLargeBatteryFleetCache();
    calls.length = 0;
    const stale = await loadLargeBatteryFleet(justOver);
    expect(stale?.source).toBe("energy-charts");
    expect(stale?.powerGw).toBeCloseTo(4.592, 3);
    expect(calls.some((url) => url.includes("energy-charts.info"))).toBe(true);
  });

  it("prefers a live Battery Charts stand over the snapshot", async () => {
    batteryCharts = "live";
    const fleet = await loadLargeBatteryFleet(STAND);
    expect(fleet?.source).toBe("battery-charts");
    expect(fleet?.powerGw).toBeCloseTo(5, 5);
    expect(fleet?.energyGwh).toBeCloseTo(9, 5);
    expect(fleet?.updatedLabel.de).toBe("22. Oktober 2026");
    expect(calls.some((url) => url.includes("energy-charts.info"))).toBe(false);
  });
});
