import { readFileSync } from "node:fs";
import { join } from "node:path";

import { loadMonatPageData } from "@/lib/monatPageData.server";

jest.mock("@/lib/germanyView", () => ({
  loadGermanyView: jest.fn(async () => {
    throw new Error("Energy-Charts offline (Test)");
  }),
}));

describe("loadMonatPageData", () => {
  it("nutzt eingefrorenen Tag-Roll-Snapshot ohne Live-API", async () => {
    const data = await loadMonatPageData("2026-10", new Date("2026-11-01T12:00:00Z"));
    expect(data.observationLive).toBe(true);
    expect(data.dataStand).toBe("Energy-Charts-Snapshot");
    expect(data.records.length).toBeGreaterThan(20);
    const snap = JSON.parse(
      readFileSync(join(process.cwd(), "data/month-observation/2026-10-auffaelligkeit.json"), "utf8"),
    );
    expect(data.records[0]?.dateKey).toBe(snap.records[0]?.dateKey);
  });
});
