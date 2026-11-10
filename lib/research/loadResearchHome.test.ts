import dayFixture from "@/data/forschung/day.json";
import rollSnapshot from "@/data/tag-pages/roll-snapshot.json";

import { expectedBerlinQuarters } from "@/lib/berlinDayCompleteness";
import { buildResearchHome, pickResearchDay } from "@/lib/research/loadResearchHome.server";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

function slotsFromResidualGw(dateKey: string, gwSeries: number[]): ResidualSlot[] {
  return gwSeries.map((gw, i) => ({
    timestampIso: `${dateKey}T00:00:00.000Z`,
    hourBerlin: Math.floor(i / 4),
    minuteBerlin: (i % 4) * 15,
    loadMw: gw * 1000,
    windMw: 0,
    solarMw: 0,
  }));
}

function dayFromGw(dateKey: string, gwSeries: number[]): ResidualDay {
  return { dateBerlin: dateKey, slots: slotsFromResidualGw(dateKey, gwSeries) };
}

const residualGw = (dayFixture as { R: number[] }).R;

describe("loadResearchHome · Gestern-Pipeline", () => {
  it("pickResearchDay bevorzugt gestern bei 96/96", () => {
    const complete0911 = dayFromGw("2026-11-09", residualGw);
    const complete0811 = dayFromGw("2026-11-08", residualGw);
    const partial0911: ResidualDay = {
      dateBerlin: "2026-11-09",
      slots: complete0911.slots.slice(0, 69),
    };
    const picked = pickResearchDay([partial0911, complete0811, complete0911], "2026-11-10");
    expect(picked?.dateBerlin).toBe("2026-11-09");
    expect(picked!.slots.length).toBe(expectedBerlinQuarters("2026-11-09"));
  });

  it("09.11.2026 Modellwerte und Woche 03.–09.11. aus Snapshot", () => {
    const snapDays = (rollSnapshot as { days: ResidualDay[] }).days;
  const weekKeys = ["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"];
    const byKey = new Map(snapDays.map((d) => [d.dateBerlin, d]));
    const days = weekKeys.map((k) => (k === "2026-11-09" ? dayFromGw(k, residualGw) : byKey.get(k)!)).filter(Boolean);
    const model = buildResearchHome(days, "2026-11-10");
    expect(model).not.toBeNull();
    expect(model!.day.dateKey).toBe("2026-11-09");
    expect(model!.day.peakGw).toBeCloseTo(68.4, 1);
    expect(model!.day.peakTime).toBe("17:15");

    const x2 = model!.day.stages.find((s) => s.factor === 2)!.reductionGw;
    const x5 = model!.day.stages.find((s) => s.factor === 5)!.reductionGw;
    const x10 = model!.day.stages.find((s) => s.factor === 10)!.reductionGw;
    expect(x2).toBeCloseTo(2.52, 2);
    expect(x5).toBeCloseTo(5.81, 2);
    expect(x10).toBeCloseTo(7.46, 2);
    expect(model!.day.hero4hGw).toBeCloseTo(7.5, 2);

    expect(model!.weekHeadline).toMatch(
      /^Letzte Woche hätte doppelt so viel Speicher die Tagesspitze jeden Tag um .+ bis .+ GW gesenkt\.$/
    );
    expect(model!.week[0]?.shortLabel).toBe("03.11.");
    expect(model!.week[model!.week.length - 1]?.shortLabel).toBe("09.11.");
  });
});
