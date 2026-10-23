import { energyColor } from "@/lib/dayRingScale";
import {
  chargedWouldHave,
  fleetSizeLabel,
  eveningPeakStat,
  formatGw1,
  formatGwh,
  fullSurplusFactor,
  heroSentence,
  liveClockCaption,
  onceRoundDeltaGw,
  ringCalloutText,
  saturationNote,
  sliderValueText,
  weekdayIndex,
} from "@/lib/dayRingStory";
import fixture from "@/lib/fixtures/residual-2026-10-11-20.json";
import { buildLiveDispatchStory, LIVE_DISPATCH_FACTORS, type LiveDispatchFactor, type LiveDispatchStory } from "@/lib/liveFleetDispatch";
import type { ResidualDay } from "@/lib/windSolarResidual";

/**
 * Battery Charts public stand that the 11 October check was run against.
 * The page reads the live fleet. This test only pins that stand to the model output.
 */
const FLEET_POWER_MW = 4515.54022;
const FLEET_ENERGY_MWH = 7860.01657;

const days = fixture as ResidualDay[];

function storiesFor(date: string): Record<LiveDispatchFactor, LiveDispatchStory> {
  const day = days.find((entry) => entry.dateBerlin === date);
  if (!day) {
    throw new Error(`missing ${date}`);
  }
  const built = {} as Record<LiveDispatchFactor, LiveDispatchStory>;
  for (const factor of LIVE_DISPATCH_FACTORS) {
    built[factor] = buildLiveDispatchStory({
      day,
      fallback: true,
      powerMw: FLEET_POWER_MW,
      energyMwh: FLEET_ENERGY_MWH,
      factor,
    });
  }
  return built;
}

function residualExtentGw(day: ResidualDay): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const slot of day.slots) {
    const gw = (slot.loadMw - slot.windMw - slot.solarMw) / 1000;
    min = Math.min(min, gw);
    max = Math.max(max, gw);
  }
  return { min, max };
}

describe("day ring story on the October 2026 fixture", () => {
  it("prints the 11 October fleet peaks from the model", () => {
    const stories = storiesFor("2026-10-11");
    const x1 = stories[1];
    expect(x1.eveningPeakBeforeGw).not.toBeNull();
    expect(formatGw1(x1.eveningPeakBeforeGw ?? 0, "de")).toBe("38,1");
    expect(formatGw1(x1.eveningPeakAfterGw ?? 0, "de")).toBe("33,5");
    expect(onceRoundDeltaGw(x1.eveningPeakBeforeGw ?? 0, x1.eveningPeakAfterGw ?? 0)).toBe(4.5);
    expect(formatGwh(x1.chargedGwh, "de")).toBe("7,9");
    expect(chargedWouldHave(x1.chargedGwh, 1, "de")).toBe("7,9 GWh hätten die heutigen Großspeicher geladen");
    expect(chargedWouldHave(stories[5].chargedGwh, 5, "de")).toBe(
      "22,8 GWh hätte die 5-fache Großspeicher-Flotte geladen"
    );
    expect(fleetSizeLabel(1, x1.powerMw, x1.energyMwh, "de")).toBe("×1: 4,5 GW · 7,9 GWh");
    expect(fleetSizeLabel(5, stories[5].powerMw, stories[5].energyMwh, "de")).toBe(
      "×5: 22,6 GW · 39,3 GWh (5 × 4,52 GW)"
    );
    expect(fleetSizeLabel(5, stories[5].powerMw, stories[5].energyMwh, "de")).not.toContain("22,5");
    expect(formatGw1(stories[2].eveningPeakAfterGw ?? 0, "de")).toBe("31,7");
    expect(formatGw1(stories[5].eveningPeakAfterGw ?? 0, "de")).toBe("30,7");
    expect(formatGw1(stories[10].eveningPeakAfterGw ?? 0, "de")).toBe("30,7");
    expect(formatGwh(stories[5].chargedGwh, "de")).toBe("22,8");
    expect(formatGwh(stories[10].chargedGwh, "de")).toBe("22,8");
    const saturated = fullSurplusFactor(stories);
    expect(saturated).toBe(5);
    expect(saturated).toBeLessThan(10);
    expect(saturationNote(saturated ?? 1, "de")).toBe(
      `Ab ×${saturated} ist der ganze Mittagsüberschuss gespeichert. Mehr Speicher bringt an diesem Tag nichts mehr, weil kein Strom übrig ist.`
    );
    expect(sliderValueText(5, stories[5].eveningPeakAfterGw, "de")).toBe("×5, Abendspitze 30,7 GW");
    expect(eveningPeakStat(x1.eveningPeakBeforeGw, x1.eveningPeakAfterGw, "de")).toEqual({
      value: "33,5",
      note: "−4,5 GW gegenüber ohne Speicher",
    });
    expect(eveningPeakStat(stories[5].eveningPeakBeforeGw, stories[5].eveningPeakAfterGw, "de")).toEqual({
      value: "30,7",
      note: "−7,4 GW gegenüber ohne Speicher",
    });
    expect(eveningPeakStat(stories[5].eveningPeakBeforeGw, stories[5].eveningPeakAfterGw, "en")?.note).toBe(
      "−7.4 GW vs. no storage"
    );
    expect(ringCalloutText("midday", -6.6844, "de")).toBe("Überschuss −6,7");
    expect(ringCalloutText("midday", -6.6844, "en")).toBe("Surplus −6.7");
    expect(ringCalloutText("night", 3.6976, "de")).toBe("Nacht +3,7");
    expect(ringCalloutText("night", -2.04, "en")).toBe("Night −2.0");
    expect(weekdayIndex("2026-10-11")).toBe(7);
    expect(heroSentence({ dateBerlin: "2026-10-11", todayKey: "2026-10-21", surplusGwh: x1.surplusGwh }).de).toBe(
      "Am Sonntag hatte der Mittag Strom übrig, den der Abend gebraucht hätte."
    );
  });

  it("keeps a ring sentence for 20 October, when the model finds no surplus", () => {
    const day = days.find((entry) => entry.dateBerlin === "2026-10-20");
    if (!day) {
      throw new Error("missing 20 October");
    }
    const extent = residualExtentGw(day);
    expect(formatGw1(extent.min, "de")).toBe("18,2");
    expect(formatGw1(extent.max, "de")).toBe("47,7");
    expect(energyColor(extent.max)).toBe("#FF6655");
    const stories = storiesFor("2026-10-20");
    expect(stories[1].surplusGwh).toBe(0);
    expect(stories[1].chargedGwh).toBe(0);
    expect(fullSurplusFactor(stories)).toBeNull();
    expect(chargedWouldHave(stories[1].chargedGwh, 1, "de")).toBeNull();
    expect(heroSentence({ dateBerlin: "2026-10-20", todayKey: "2026-10-21", surplusGwh: stories[1].surplusGwh }).de).toBe(
      "Gestern gab es keinen Überschuss – Speicher hätten im Modell nichts zu verschieben."
    );
    expect(formatGw1(stories[1].eveningPeakBeforeGw ?? 0, "de")).toBe("47,7");
  });

  it("writes the live ring caption from the unrounded evening peaks", () => {
    expect(liveClockCaption(38.04, 33.66, 5, "de")).toBe(
      "Residuallast über 24 Stunden, Abendspitze 38,0 GW ohne, 33,7 GW mit Speicher ×5."
    );
    expect(liveClockCaption(null, null, 1, "de")).toBe("Residuallast über 24 Stunden, ohne Abendspitze.");
  });
});
