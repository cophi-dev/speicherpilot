import {
  fourHourSensitivityLine,
  researchDayEyebrow,
  saturationSectionH2,
  weekHeadline,
  weekSectionEyebrow,
} from "@/lib/research/researchFormat";
import type { ResearchDayModel, ResearchWeekDay } from "@/lib/research/researchTypes";

describe("fourHourSensitivityLine", () => {
  it("×5: 4h auf ×10-Niveau ohne widersprüchliches «mehr als»", () => {
    expect(fourHourSensitivityLine(7.5, 7.46, 5)).toBe(
      "mit 4 h: −7,5 GW – so viel wie ×10 mit heutiger Speicherdauer"
    );
  });

  it("nur Basiszeile unter ×10-Niveau", () => {
    expect(fourHourSensitivityLine(6.2, 6.21, 5)).toBe("mit 4 h: −6,2 GW");
    expect(fourHourSensitivityLine(7.46, 7.46, 2)).toBe("mit 4 h: −7,5 GW");
  });
});

function weekStub(reductions: number[]): ResearchWeekDay[] {
  return reductions.map((r, i) => ({
    dateKey: `2026-11-0${i + 3}`,
    shortLabel: `0${i + 3}.11.`,
    weekdayShort: "Mo",
    isFocus: false,
    points: [
      {
        factor: 2,
        reduction175Gw: r,
        reduction4hGw: r,
        dayLimitGw: 20,
        marker175: "hollow",
        marker4h: "tick",
      },
      {
        factor: 5,
        reduction175Gw: r * 2,
        reduction4hGw: r * 2,
        dayLimitGw: 20,
        marker175: "hollow",
        marker4h: "tick",
      },
      {
        factor: 10,
        reduction175Gw: r * 3,
        reduction4hGw: r * 3,
        dayLimitGw: 20,
        marker175: "hollow",
        marker4h: "tick",
      },
    ],
  }));
}

describe("weekHeadline", () => {
  it("nutzt ×2-Min/Max der Woche", () => {
    expect(weekHeadline(weekStub([2.52, 3.1, 5.8, 4.0, 3.3, 2.9, 4.5]))).toBe(
      "Letzte Woche hätte doppelt so viel Speicher die Tagesspitze jeden Tag um 2,5 bis 5,8 GW gesenkt."
    );
  });
});

const dayStub: ResearchDayModel = {
  dateKey: "2026-11-09",
  dateLabel: "Montag, 09.11.2026",
  shortLabel: "09.11.",
  weekdayLabel: "Montag",
  peakGw: 1,
  peakTime: "12:00",
  residualGw: [],
  stages: [],
  series: [],
  saturation: [],
  saturation4h: [],
  h1: "",
  heroFactor: 5,
  heroReductionGw: 1,
  hero4hGw: 1,
  tenGw: 1,
};

describe("Gestern vs. letzter voller Tag", () => {
  it("Eyebrow und Sättigungs-H2", () => {
    expect(researchDayEyebrow(dayStub, "yesterday")).toBe(
      "GESTERN · MO, 09.11.2026 · NATIONAL · TAGESHORIZONT"
    );
    expect(researchDayEyebrow(dayStub, "latestComplete")).toBe(
      "LETZTER VOLLSTÄNDIGER TAG · MO, 09.11.2026 · NATIONAL · TAGESHORIZONT"
    );
    expect(saturationSectionH2(dayStub, "yesterday")).toMatch(/^Gestern brachte/);
    expect(saturationSectionH2(dayStub, "latestComplete")).toBe(
      "Am 09.11. brachte ab ×5 jedes weitere GW kaum noch etwas."
    );
  });

  it("Wochen-Eyebrow bei Fallback", () => {
    const week = weekStub([1, 2, 3, 4, 5, 6, 7]);
    expect(weekSectionEyebrow(week, "yesterday")).toMatch(/^DIESE WOCHE ·/);
    expect(weekSectionEyebrow(week, "latestComplete")).toMatch(/^7 VOLLE TAGE ·/);
  });
});
