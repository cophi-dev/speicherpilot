import { readFileSync } from "node:fs";
import { join } from "node:path";

import { auffaelligkeitForDay, scoreDay, type TagesKennzahlRecord } from "@/lib/auffaelligkeit";

const FIXTURE = join(__dirname, "__fixtures__", "auffaelligkeit-records.json");

function loadFixture(): TagesKennzahlRecord[] {
  return JSON.parse(readFileSync(FIXTURE, "utf8")) as TagesKennzahlRecord[];
}

describe("auffaelligkeit Regel v1", () => {
  const records = loadFixture();

  it("29.10.: Preisspanne gewinnt vor Abendspitze (Platz 1)", () => {
    const scored = scoreDay(records, "2026-10-29");
    expect(scored?.[0]?.key).toBe("spread");
    expect(scored?.[0]?.rank).toBe(1);
    const r = auffaelligkeitForDay(records, "2026-10-29");
    expect(r.kind).toBe("metric");
    if (r.kind === "metric") {
      expect(r.key).toBe("spread");
    }
    expect(r.headline).toContain("Börsenpreis lag zwischen");
    expect(r.headline).toContain("So groß wie an keinem Tag der letzten 30");
  });

  it("31.10.: Anteil Wind+Sonne Platz 1", () => {
    const r = auffaelligkeitForDay(records, "2026-10-31");
    expect(r.headline).toBe(
      "Sa, 31.10.: Wind und Sonne deckten nur 17,7 % der Last, so wenig wie an keinem Tag der letzten 30."
    );
  });

  it("02.11.: Abendspitze Platz 2", () => {
    const scored = scoreDay(records, "2026-11-02");
    const peak = scored?.find((s) => s.key === "evening_peak_gw");
    expect(peak?.rank).toBe(2);
    const r = auffaelligkeitForDay(records, "2026-11-02");
    expect(r.kind).toBe("metric");
    expect(r.kopfSubline).toMatch(/fast so hoch wie am 29\.10\./i);
  });

  it("27.10.: unauffälliger Tag (Ersatz)", () => {
    const r = auffaelligkeitForDay(records, "2026-10-27");
    expect(r.kind).toBe("keine");
    expect(r.headline).toContain("unauffälliger Tag");
  });
});
