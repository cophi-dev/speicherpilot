import { fourHourSensitivityLine, weekHeadline } from "@/lib/research/researchFormat";
import type { ResearchWeekDay } from "@/lib/research/researchTypes";

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
      "Letzte Woche hätte doppelt so viel Speicher die Abendspitze jeden Tag um 2,5 bis 5,8 GW gesenkt."
    );
  });
});
