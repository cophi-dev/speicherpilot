import { formatGwSenkung } from "@/lib/research/fleetBasis";
import type { ResearchDayModel, ResearchFactor, ResearchWeekDay } from "@/lib/research/researchTypes";

export function heroReductionDisplay(gw: number): string {
  return formatGwSenkung(gw);
}

export function weekRangeLabel(week: ResearchWeekDay[]): string {
  if (week.length === 0) return "";
  const first = week[0]!;
  const last = week[week.length - 1]!;
  return `${first.shortLabel}–${last.shortLabel}`;
}

/** Eine Dezimalstelle, kein Vorzeichen (Senkungsmagnitude). */
export function formatReductionMagnitudeGw(gw: number): string {
  const rounded = Math.round(gw * 10) / 10;
  return rounded.toFixed(1).replace(".", ",");
}

/** ×2 / 1,76 h – Headline aus Min/Max der Wochentageswerte. */
export function weekHeadline(week: ResearchWeekDay[]): string {
  if (week.length === 0) return "";
  const vals = week.map((d) => d.points.find((p) => p.factor === 2)!.reduction175Gw);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return `Letzte Woche hätte doppelt so viel Speicher die Abendspitze jeden Tag um ${formatReductionMagnitudeGw(min)} bis ${formatReductionMagnitudeGw(max)} GW gesenkt.`;
}

export const weekDurationFootnote =
  "1,76 h = heutige Flottendauer (Modell) · 4 h = mehr Energie, oft trotzdem GW-Stopp statt reiner Stunden.";

export function researchEyebrowGestern(day: ResearchDayModel): string {
  const parts = day.dateLabel.split(", ");
  const cal = parts[1] ?? "";
  const wd = day.weekdayLabel.slice(0, 2).toUpperCase();
  return `GESTERN · ${wd}, ${cal.toUpperCase()} · NATIONAL · TAGESHORIZONT`;
}

export function fourHourSensitivityLine(fourhGw: number, tenGw: number, factor?: ResearchFactor): string {
  const base = `mit 4 h: ${formatGwSenkung(fourhGw)}`;
  if (factor === 5) {
    const fourDisp = Math.round(fourhGw * 10) / 10;
    const tenDisp = Math.round(tenGw * 10) / 10;
    if (fourhGw >= tenGw - 1e-9 && fourDisp >= tenDisp) {
      return `${base} – so viel wie ×10 mit heutiger Speicherdauer`;
    }
  }
  return base;
}
