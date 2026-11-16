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

/** Point label on residual-load charts, e.g. `68,24 GW · 07:45`. */
export function formatResearchPeakPointLabel(peakGw: number, peakTime: string): string {
  return `${peakGw.toFixed(2).replace(".", ",")} GW · ${peakTime}`;
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
  return `Mit doppelter Flotte (×2) wäre die Tagesspitze letzte Woche jeden Tag um ${formatReductionMagnitudeGw(min)} bis ${formatReductionMagnitudeGw(max)} GW gesunken.`;
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

/** Stunden mit Überschuss (Restlast &lt; 0) vor 17:00, in GWh (Modell). */
function chargeOpportunityGwh(series: ResearchDayModel["series"]): number {
  return series.reduce(
    (sum, p) => (p.hour < 17 && p.residualGw < 0 ? sum + (-p.residualGw) * 0.25 : sum),
    0,
  );
}

/** Ab ×5 Sättigung: optional Begründung nur wenn Daten beide Kriterien tragen. */
export function saturationSectionH2(day: ResearchDayModel, perspective: ResearchDayPerspective): string {
  const lead =
    perspective === "yesterday"
      ? "Gestern brachte ab ×5 jedes weitere GW kaum noch etwas"
      : `Am ${day.shortLabel} brachte ab ×5 jedes weitere GW kaum noch etwas`;
  const s5 = day.stages.find((s) => s.factor === 5);
  const s10 = day.stages.find((s) => s.factor === 10);
  if (!s5 || !s10 || day.series.length === 0) {
    return `${lead}.`;
  }
  const marginalDay = s10.reductionGw - s5.reductionGw;
  const flatEvening = marginalDay < 0.45;
  const lowSurplus = chargeOpportunityGwh(day.series) < 6;
  if (flatEvening && lowSurplus) {
    return `${lead}, weil die Abendspitze schon flach ist und tagsüber nicht genug Überschuss zum Nachladen da ist.`;
  }
  return `${lead}; ab ×5 senkt die Spitze kaum weiter.`;
}

export function saturationChartAriaLabel(day: ResearchDayModel, perspective: ResearchDayPerspective): string {
  if (perspective === "yesterday") return "Gestern auf der Sättigungskurve";
  return `Sättigungskurve für ${day.shortLabel}`;
}

export function weekSectionEyebrow(week: ResearchWeekDay[], perspective: ResearchDayPerspective): string {
  const range = weekRangeLabel(week);
  if (perspective === "yesterday") return `LETZTE 7 TAGE · ${range} · TAGESHORIZONT`;
  return `7 VOLLE TAGE · ${range} · TAGESHORIZONT`;
}

export function researchIncompleteFootnote(note: ResearchIncompleteDayNote): string {
  const noon = new Date(`${note.dateKey}T12:00:00+01:00`);
  const weekdayShort = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" }).format(noon);
  const [, m, d] = note.dateKey.split("-");
  return `Daten für ${weekdayShort}, ${d}.${m}. sind bei Energy-Charts noch unvollständig (${note.quarters}/${note.expected} Viertelstunden); die Seite springt automatisch um, sobald sie vollständig sind.`;
}

export function heroSpikeDurationLine(hoursAboveCap: number, factor: ResearchFactor): string {
  const h =
    hoursAboveCap >= 10 ? Math.round(hoursAboveCap) : (Math.round(hoursAboveCap * 10) / 10).toFixed(1).replace(".", ",");
  return `Die Abendspitze lag rund ${h} Stunden über der ×${factor}-Linie. Die Flotte hält volle Leistung nur 1,76 h.`;
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
