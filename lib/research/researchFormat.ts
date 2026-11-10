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

export function researchEyebrowGestern(day: ResearchDayModel): string {
  const parts = day.dateLabel.split(", ");
  const cal = parts[1] ?? "";
  const wd = day.weekdayLabel.slice(0, 2).toUpperCase();
  return `GESTERN · ${wd}, ${cal.toUpperCase()} · NATIONAL · TAGESHORIZONT`;
}

export function fourHourSensitivityLine(fourhGw: number, tenGw: number, factor?: ResearchFactor): string {
  const base = `mit 4 h: ${formatGwSenkung(fourhGw)}`;
  if (factor === 5 && fourhGw > tenGw + 1e-9) {
    const tenLabel = formatGwSenkung(tenGw).replace("−", "");
    return `${base}, mehr als ×10 (${tenLabel})`;
  }
  return base;
}
