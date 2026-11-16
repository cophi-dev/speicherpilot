import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  activeSeries,
  assertCompactRunKeys,
  dailyPeaks,
  parseMonatReglerCompact,
} from "@/lib/monatReglerAsset";

const compactPath = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-compact.json");

describe("monatReglerAsset", () => {
  const raw = JSON.parse(readFileSync(compactPath, "utf8"));
  const compact = parseMonatReglerCompact(raw);

  it("parst das kompakte Asset mit 2980 Intervallen", () => {
    expect(compact.n).toBe(2980);
    expect(compact.tm).toHaveLength(2980);
    expect(compact.r).toHaveLength(2980);
    assertCompactRunKeys(compact);
  });

  it("×1 liefert beobachtete Restlast ohne Overlay", () => {
    const s = activeSeries(compact, 1, "spitze");
    expect(s.rPrimeMw).toEqual(s.rMw);
    expect(s.cMw.every((v) => v === 0)).toBe(true);
  });

  it("Tagesmaxima für ×10 Spitze unter Referenz", () => {
    const s = activeSeries(compact, 10, "spitze");
    const days = dailyPeaks(compact, s);
    const monthMax = Math.max(...days.map((d) => d.maxFleetGw));
    expect(monthMax).toBeLessThan(compact.refPeakMw / 1000 + 0.05);
    expect(monthMax).toBeGreaterThan(50);
  });
});