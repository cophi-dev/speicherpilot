import { formatGwSenkung } from "@/lib/research/fleetBasis";
import type {
  ResearchDayModel,
  ResearchDayPerspective,
  ResearchFactor,
  ResearchIncompleteDayNote,
  ResearchWeekDay,
} from "@/lib/research/researchTypes";

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
  return `Letzte Woche hätte doppelt so viel Speicher die Tagesspitze jeden Tag um ${formatReductionMagnitudeGw(min)} bis ${formatReductionMagnitudeGw(max)} GW gesenkt.`;
}

export const weekDurationFootnote =
  "1,76 h = heutige Flottendauer (Modell) · 4 h = mehr Energie, oft trotzdem GW-Stopp statt reiner Stunden.";

function researchDayEyebrowTail(day: ResearchDayModel): string {
  const parts = day.dateLabel.split(", ");
  const cal = parts[1] ?? "";
  const wd = day.weekdayLabel.slice(0, 2).toUpperCase();
  return `${wd}, ${cal.toUpperCase()} · NATIONAL · TAGESHORIZONT`;
}

export function researchDayEyebrow(day: ResearchDayModel, perspective: ResearchDayPerspective): string {
  const tail = researchDayEyebrowTail(day);
  if (perspective === "yesterday") return `GESTERN · ${tail}`;
  return `LETZTER VOLLSTÄNDIGER TAG · ${tail}`;
}

/** @deprecated Prefer researchDayEyebrow with dayPerspective from the model. */
export function researchEyebrowGestern(day: ResearchDayModel): string {
  return researchDayEyebrow(day, "yesterday");
}

export function saturationSectionH2(day: ResearchDayModel, perspective: ResearchDayPerspective): string {
  if (perspective === "yesterday") return "Gestern brachte ab ×5 jedes weitere GW kaum noch etwas.";
  return `Am ${day.shortLabel} brachte ab ×5 jedes weitere GW kaum noch etwas.`;
}

export function saturationChartAriaLabel(day: ResearchDayModel, perspective: ResearchDayPerspective): string {
  if (perspective === "yesterday") return "Gestern auf der Sättigungskurve";
  return `Sättigungskurve für ${day.shortLabel}`;
}

export function weekSectionEyebrow(week: ResearchWeekDay[], perspective: ResearchDayPerspective): string {
  const range = weekRangeLabel(week);
  if (perspective === "yesterday") return `DIESE WOCHE · ${range} · TAGESHORIZONT`;
  return `7 VOLLE TAGE · ${range} · TAGESHORIZONT`;
}

export function researchIncompleteFootnote(note: ResearchIncompleteDayNote): string {
  const noon = new Date(`${note.dateKey}T12:00:00+01:00`);
  const weekdayShort = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" }).format(noon);
  const [, m, d] = note.dateKey.split("-");
  return `Daten für ${weekdayShort}, ${d}.${m}. sind bei Energy-Charts noch unvollständig (${note.quarters}/${note.expected} Viertelstunden); die Seite springt automatisch um, sobald sie vollständig sind.`;
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
