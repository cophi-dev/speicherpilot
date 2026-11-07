import { readFileSync } from "node:fs";
import { join } from "node:path";

import { digestTagDayEnergy, tagMiddayStoryBody } from "@/lib/tagDayStory";
import type { ResidualDay } from "@/lib/windSolarResidual";

describe("tagMiddayStory", () => {
  it("2026-10-24: Tagesquote unter 100 % aber positive Viertelstunden", () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), "artifacts/launch-r4-20261107T0918Z/national-day-2026-10-24.json"), "utf8"),
    ) as {
      slots: Array<{
        timestampIso: string;
        hourBerlin: number;
        loadMw: number;
        windOnshoreMw: number;
        windOffshoreMw: number;
        solarMw: number;
        minuteBerlin?: number;
      }>;
    };
    const day: ResidualDay = {
      dateBerlin: "2026-10-24",
      slots: raw.slots.map((s) => {
        const hm = s.timestampIso.slice(11, 16);
        const minuteBerlin = s.minuteBerlin ?? Number(hm.slice(3, 5));
        return {
          timestampIso: s.timestampIso,
          hourBerlin: s.hourBerlin,
          minuteBerlin,
          loadMw: s.loadMw,
          windMw: s.windOnshoreMw + s.windOffshoreMw,
          solarMw: s.solarMw,
        };
      }),
    };
    const d = digestTagDayEnergy(day);
    expect(d.energyQuotePct).toBeGreaterThan(98);
    expect(d.energyQuotePct).toBeLessThan(100.5);
    expect(d.positiveQuarterHours).toBeGreaterThan(0);
    expect(d.positiveSurplusGwh).toBeGreaterThan(50);
    const text = tagMiddayStoryBody(day);
    expect(text).not.toMatch(/Kein Überschuss zum Laden/i);
    expect(text).not.toMatch(/Tagesschnitt|Ausschluss/i);
    expect(text).toMatch(/zeitweise über der Last/);
    expect(text).toMatch(/51/);
    expect(text).toMatch(/13:30/);
  });
});
