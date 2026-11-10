import "server-only";

import { prevBerlinDateKey } from "@/lib/berlinCalendar";
import { expectedBerlinQuarters } from "@/lib/berlinDayCompleteness";
import wolkeSummary from "@/data/forschung/wolke_12m_zusammenfassung.json";
import wolkeScatter from "@/data/forschung/wolke-scatter.json";
import {
  additionalFleetMw,
  RESEARCH_FACTORS,
  RESEARCH_FLEET_DURATION_H,
  RESEARCH_FLEET_LABEL_DE,
  type ResearchFactor,
} from "@/lib/research/fleetBasis";
import {
  cappedResidualSeriesGw,
  factorReductionGw,
  peakReductionGw,
  saturationCurveGw,
} from "@/lib/research/nationalPeakShaveEngine";
import type {
  ResearchCloudModel,
  ResearchDayModel,
  ResearchHomeModel,
  ResearchWeekDay,
} from "@/lib/research/researchTypes";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";

function residualMwFromSlots(slots: ResidualSlot[]): number[] {
  return slots.map((s) => s.loadMw - s.windMw - s.solarMw);
}

function peakMeta(slots: ResidualSlot[], residualMw: number[]): { peakGw: number; peakTime: string } {
  let idx = 0;
  let max = residualMw[0] ?? 0;
  for (let i = 1; i < residualMw.length; i += 1) {
    if (residualMw[i]! > max) {
      max = residualMw[i]!;
      idx = i;
    }
  }
  const slot = slots[idx]!;
  const peakTime = `${String(slot.hourBerlin).padStart(2, "0")}:${String(slot.minuteBerlin).padStart(2, "0")}`;
  return { peakGw: max / 1000, peakTime };
}

function formatDateLabel(dateKey: string): { weekday: string; weekdayShort: string; short: string; long: string } {
  const noon = new Date(`${dateKey}T12:00:00+01:00`);
  const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "Europe/Berlin" }).format(noon);
  const weekdayShort = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" }).format(noon);
  const [, m, d] = dateKey.split("-");
  return {
    weekday,
    weekdayShort,
    short: `${d}.${m}.`,
    long: `${weekday}, ${d}.${m}.${dateKey.slice(0, 4)}`,
  };
}

function buildDayModel(day: ResidualDay): ResearchDayModel {
  const residualMw = residualMwFromSlots(day.slots);
  const { peakGw, peakTime } = peakMeta(day.slots, residualMw);
  const labels = formatDateLabel(day.dateBerlin);

  const stages = RESEARCH_FACTORS.map((factor) => {
    const base = additionalFleetMw(factor);
    const red = peakReductionGw(residualMw, base.powerMw, base.energyMwh);
    const four = additionalFleetMw(factor, 4);
    const red4 = peakReductionGw(residualMw, four.powerMw, four.energyMwh);
    return {
      factor,
      reductionGw: red.reductionGw,
      capGw: red.capMw / 1000,
      reduction4hGw: red4.reductionGw,
    };
  });

  const defaultFactor: ResearchFactor = 5;
  const hero = stages.find((s) => s.factor === defaultFactor)!;
  const ten = stages.find((s) => s.factor === 10)!;

  const capGw = hero.capGw;
  const capped = cappedResidualSeriesGw(residualMw, capGw * 1000);
  const series = day.slots.map((slot, i) => ({
    hour: slot.hourBerlin,
    minute: slot.minuteBerlin,
    residualGw: residualMw[i]! / 1000,
    cappedGw: capped[i]!,
  }));

  const saturation = saturationCurveGw(residualMw, 10, RESEARCH_FLEET_DURATION_H).map((p) => ({
    factor: p.factor,
    reductionGw: p.reductionGw,
  }));
  const saturation4h = saturationCurveGw(residualMw, 10, 4).map((p) => ({
    factor: p.factor,
    reductionGw: p.reductionGw,
  }));

  const h1 = "Gestern fehlten Stunden, nicht Gigawatt.";

  return {
    dateKey: day.dateBerlin,
    dateLabel: labels.long,
    shortLabel: labels.short,
    weekdayLabel: labels.weekday,
    peakGw,
    peakTime,
    residualGw: residualMw.map((v) => v / 1000),
    stages,
    series,
    saturation,
    saturation4h,
    h1,
    heroFactor: defaultFactor,
    heroReductionGw: hero.reductionGw,
    hero4hGw: hero.reduction4hGw,
    tenGw: ten.reductionGw,
  };
}

function weekHeadline(week: ResearchWeekDay[]): string {
  let count = 0;
  for (const d of week) {
    const x2 = d.points.find((p) => p.factor === 2);
    if (x2?.marker4h === "square") count += 1;
  }
  return `Mit 4 h fehlen bei ×2 an ${count} von 7 Tagen GW, nicht Stunden.`;
}

function buildWeek(days: ResidualDay[], focusKey: string): ResearchWeekDay[] {
  const byKey = new Map(days.map((d) => [d.dateBerlin, d]));
  const keys: string[] = [];
  let k = focusKey;
  for (let i = 0; i < 7; i += 1) {
    keys.unshift(k);
    k = prevBerlinDateKey(k);
  }
  return keys
    .filter((key) => byKey.has(key))
    .map((key) => {
      const day = byKey.get(key)!;
      const residualMw = residualMwFromSlots(day.slots);
      const labels = formatDateLabel(key);
      const dayLimitGw = peakReductionGw(residualMw, 1e9, 1e9).reductionGw;
      const points = RESEARCH_FACTORS.map((factor) => {
        const r175 = factorReductionGw(residualMw, factor);
        const add4 = additionalFleetMw(factor, 4);
        const r4 = peakReductionGw(residualMw, add4.powerMw, add4.energyMwh).reductionGw;
        const powerCapGw = add4.powerMw / 1000;
        const atDayLimit175 = r175 >= dayLimitGw - 0.03;
        const atDayLimit4 = r4 >= dayLimitGw - 0.03;
        const powerLimited4h = r4 >= powerCapGw - 0.02 && !atDayLimit4;
        let marker4h: "tick" | "square" | "double" = "tick";
        if (atDayLimit4) marker4h = "double";
        else if (powerLimited4h) marker4h = "square";
        const marker175: "hollow" | "dashed" = atDayLimit175 ? "dashed" : "hollow";
        return {
          factor,
          reduction175Gw: r175,
          reduction4hGw: r4,
          dayLimitGw,
          marker175,
          marker4h,
        };
      });
      return {
        dateKey: key,
        shortLabel: labels.short,
        weekdayShort: labels.weekdayShort.replace(".", ""),
        isFocus: key === focusKey,
        points,
      };
    });
}

function buildCloud(focusKey: string, day: ResearchDayModel): ResearchCloudModel {
  const summary = wolkeSummary as Record<string, { median: number; p10: number; p90: number }>;
  const median = {
    x2: summary["x2_1.7554h"].median,
    x5: summary["x5_1.7554h"].median,
    x10: summary["x10_1.7554h"].median,
  };
  const p10 = {
    x2: summary["x2_1.7554h"].p10,
    x5: summary["x5_1.7554h"].p10,
    x10: summary["x10_1.7554h"].p10,
  };
  const p90 = {
    x2: summary["x2_1.7554h"].p90,
    x5: summary["x5_1.7554h"].p90,
    x10: summary["x10_1.7554h"].p90,
  };
  const points = wolkeScatter as Array<{ date: string; x2?: number; x5?: number; x10?: number }>;
  const y = day.saturation;
  const yesterday = {
    x2: y.find((p) => p.factor === 2)?.reductionGw ?? day.stages[0]!.reductionGw,
    x5: y.find((p) => p.factor === 5)?.reductionGw ?? day.heroReductionGw,
    x10: y.find((p) => p.factor === 10)?.reductionGw ?? day.tenGw,
  };
  return { points: points as ResearchCloudModel["points"], median, p10, p90, yesterday };
}

function isStrictResearchDay(day: ResidualDay, todayKey: string): boolean {
  if (day.dateBerlin >= todayKey) return false;
  try {
    return day.slots.length === expectedBerlinQuarters(day.dateBerlin);
  } catch {
    return false;
  }
}

/** Newest Berlin day with full Energy-Charts grid (96/96 etc.) strictly before today. */
export function pickResearchDay(days: ResidualDay[], todayKey: string): ResidualDay | null {
  const yesterday = prevBerlinDateKey(todayKey);
  const yDay = days.find((d) => d.dateBerlin === yesterday);
  if (yDay && isStrictResearchDay(yDay, todayKey)) {
    return yDay;
  }
  const complete = days
    .filter((d) => isStrictResearchDay(d, todayKey))
    .sort((a, b) => (a.dateBerlin < b.dateBerlin ? 1 : -1));
  return complete[0] ?? null;
}

export function buildResearchHome(days: ResidualDay[], todayKey: string): ResearchHomeModel | null {
  const focus = pickResearchDay(days, todayKey);
  if (!focus) return null;
  const day = buildDayModel(focus);
  const week = buildWeek(days, focus.dateBerlin);
  const cloud = buildCloud(focus.dateBerlin, day);
  return {
    day,
    week,
    weekHeadline: weekHeadline(week),
    cloud,
    fleetLabel: RESEARCH_FLEET_LABEL_DE,
  };
}

