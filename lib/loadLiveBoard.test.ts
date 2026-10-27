import { DAILY_SERIES_REVALIDATE_SECONDS } from "@/lib/dailySeriesCache";
import { clearLiveBoardCache, loadLiveBoard } from "@/lib/loadLiveBoard";

jest.mock("server-only", () => ({}));

const STAMP = Date.parse("2026-10-22T10:00:00Z");
const NOW = new Date("2026-10-22T12:00:00Z");
const LATER = new Date("2026-10-27T12:00:00Z");

function jsonFor(url: string): unknown {
  if (url.includes("index_quarterhour")) {
    return { timestamps: [STAMP] };
  }
  if (url.includes("quarterhour_")) {
    return { series: [[STAMP, 1_000]] };
  }
  if (url.includes("/v2/price")) {
    return {
      data: [{ timestamp: "2026-10-22T12:00:00+02:00", values: { day_ahead_price: 42.5 } }],
    };
  }
  if (url.includes("/v2/signal")) {
    return {
      data: [{ timestamp: "2026-10-22T12:00:00+02:00", values: { share: 55, signal: 1 } }],
    };
  }
  return {};
}

describe("loadLiveBoard", () => {
  beforeEach(() => {
    clearLiveBoardCache();
  });

  it("revalidates each request and does not reuse another day's prices", async () => {
    let down = false;
    const revalidates: Array<number | undefined> = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit & { next?: { revalidate?: number } }) => {
      revalidates.push(init?.next?.revalidate);
      if (down) {
        throw new Error("upstream down");
      }
      return { ok: true, status: 200, json: async () => jsonFor(String(input)) } as Response;
    }) as typeof fetch;

    const first = await loadLiveBoard({ now: NOW });
    const callsAfterFirst = revalidates.length;
    down = true;
    const sameDay = await loadLiveBoard({ now: NOW });
    const nextDay = await loadLiveBoard({ now: LATER });

    expect(callsAfterFirst).toBeGreaterThan(0);
    expect(revalidates.length).toBeGreaterThan(callsAfterFirst);
    expect(revalidates.every((value) => value === DAILY_SERIES_REVALIDATE_SECONDS)).toBe(true);
    expect(first.berlinDateKey).toBe("2026-10-22");
    expect(first.modules.find((module) => module.id === "price")?.figure).toBe(42.5);
    expect(sameDay.modules.find((module) => module.id === "price")?.figure).toBe(42.5);
    expect(nextDay.berlinDateKey).toBe("2026-10-27");
    expect(nextDay.modules.find((module) => module.id === "price")).toBeUndefined();
  });
});
