import { chooseStorageDay } from "@/lib/liveFleetDispatch";
import { DAILY_SERIES_REVALIDATE_SECONDS } from "@/lib/dailySeriesCache";
import { clearWindSolarDaysCache, loadWindSolarDays } from "@/lib/loadWindSolarResidual";

jest.mock("server-only", () => ({}));

const NOW = new Date("2026-10-22T12:00:00Z");
const LATER = new Date("2026-10-27T08:00:00Z");

function payload() {
  const stamps = [
    "2026-10-22T08:00:00Z",
    "2026-10-22T09:00:00Z",
    "2026-10-22T10:00:00Z",
    "2026-10-22T15:00:00Z",
  ].map((iso) => Date.parse(iso) / 1000);
  return {
    unix_seconds: stamps,
    production_types: [
      { name: "Load", data: [10_000, 10_000, 10_000, 40_000] },
      { name: "Solar", data: [20_000, 20_000, 20_000, 1_000] },
      { name: "Wind onshore", data: [5_000, 5_000, 5_000, 2_000] },
    ],
  };
}

describe("loadWindSolarDays", () => {
  beforeEach(() => {
    clearWindSolarDaysCache();
  });

  it("revalidates on every call and keeps the series date when the next call fails", async () => {
    let mode: "ok" | "down" = "ok";
    const calls: Array<{ url: string; revalidate: number | undefined }> = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit & { next?: { revalidate?: number } }) => {
      calls.push({ url: String(input), revalidate: init?.next?.revalidate });
      if (mode === "down") {
        throw new Error("upstream down");
      }
      return {
        ok: true,
        status: 200,
        json: async () => payload(),
      } as Response;
    }) as typeof fetch;

    const first = await loadWindSolarDays(NOW);
    const second = await loadWindSolarDays(LATER);
    mode = "down";
    const failed = await loadWindSolarDays(LATER);

    expect(calls.map((call) => call.revalidate)).toEqual([
      DAILY_SERIES_REVALIDATE_SECONDS,
      DAILY_SERIES_REVALIDATE_SECONDS,
      DAILY_SERIES_REVALIDATE_SECONDS,
    ]);
    expect(first[0]?.dateBerlin).toBe("2026-10-22");
    expect(second[0]?.dateBerlin).toBe("2026-10-22");
    expect(failed.map((day) => day.dateBerlin)).toEqual(["2026-10-22"]);

    const chosen = chooseStorageDay(failed, "2026-10-27");
    expect(chosen?.day.dateBerlin).toBe("2026-10-22");
    expect(chosen?.fallback).toBe(true);
    expect(chosen?.day.dateBerlin).not.toBe("2026-10-27");
  });

  it("returns no days when the first load fails", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("upstream down");
    }) as typeof fetch;
    await expect(loadWindSolarDays(NOW)).resolves.toEqual([]);
  });
});
