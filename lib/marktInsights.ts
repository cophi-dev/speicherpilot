import { formatQuantity } from "@/lib/formatQuantity";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import { type ThreeGoalsCompareModel, type ThreeGoalsStrategyRow } from "@/lib/nationalFleetThreeGoals";
import { monthStatsForRun, type NationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel";

export type MarktInsightCategory = "tag" | "monat" | "markt";

export type MarktInsight = {
  id: string;
  category: MarktInsightCategory;
  text: string;
  period: string;
  source: string;
  methodikHref: string;
};

export type MarktInsightsRoute =
  | "start"
  | "tag"
  | "monat"
  | "ort"
  | "methodik"
  | "beitraege";

const WINDOW_START = "2026-10-10";
const WINDOW_END = "2026-11-08";

function inHomeWindow(records: TagesKennzahlRecord[]): TagesKennzahlRecord[] {
  return records.filter((r) => r.dateKey >= WINDOW_START && r.dateKey <= WINDOW_END);
}

function fmtDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

function fmtEur(v: number, digits = 2): string {
  return formatQuantity(v, "de", digits);
}

function ruleTrockenstrecke(records: TagesKennzahlRecord[], focusDay?: string): MarktInsight | null {
  const window = inHomeWindow(records);
  const day = focusDay ? window.find((r) => r.dateKey === focusDay) : window[window.length - 1];
  if (!day || day.surplusGwh >= 0.05 || day.dryStreak < 3) {
    return null;
  }
  return {
    id: "trockenstrecke",
    category: "tag",
    text: `${fmtDate(day.dateKey)} ist der ${day.dryStreak}. Tag in Folge ohne messbaren Überschuss (unter 0,05 GWh).`,
    period: `${fmtDate(WINDOW_START)}–${fmtDate(WINDOW_END)}`,
    source: "Energy-Charts Last/Erzeugung, Viertelstunde DE",
    methodikHref: "/methodik#insight-trockenstrecke",
  };
}

function ruleHohesMinimum(record: TagesKennzahlRecord | null): MarktInsight | null {
  if (!record || record.surplusGwh >= 0.05) {
    return null;
  }
  if (record.spread == null || record.pmin == null) {
    return null;
  }
  if (record.spread < 80 || record.pmin < 100 || (record.negH ?? 0) > 0) {
    return null;
  }
  return {
    id: "hohes_minimum",
    category: "markt",
    text: `Am ${fmtDate(record.dateKey)} lag die Börse zwischen ${fmtEur(record.pmin)} und ${fmtEur(record.pmax ?? record.pmin)} €/MWh. Spanne ${fmtEur(record.spread)} €/MWh, kein Viertelstunde unter 100 €/MWh und keine Stunde unter null.`,
    period: fmtDate(record.dateKey),
    source: "Bundesnetzagentur | SMARD.de, Day-Ahead DE-LU",
    methodikHref: "/methodik#insight-hohes-minimum",
  };
}

function rulePreisSpike(record: TagesKennzahlRecord | null): MarktInsight | null {
  if (!record || record.surplusGwh >= 0.05 || record.pmax == null || record.pmax < 400) {
    return null;
  }
  const at = record.pmaxAt ? ` (Viertelstunde ${record.pmaxAt})` : "";
  return {
    id: "preis_spike",
    category: "markt",
    text: `Am ${fmtDate(record.dateKey)} war der Überschuss 0 GWh. Maximum ${fmtEur(record.pmax)} €/MWh${at}.`,
    period: fmtDate(record.dateKey),
    source: "Bundesnetzagentur | SMARD.de, Day-Ahead DE-LU",
    methodikHref: "/methodik#insight-preis-spike",
  };
}

function ruleNegativpreis(records: TagesKennzahlRecord[]): MarktInsight | null {
  const window = inHomeWindow(records);
  const days = window.filter((r) => (r.negH ?? 0) > 0);
  const totalH = days.reduce((s, r) => s + (r.negH ?? 0), 0);
  if (totalH < 0.25) {
    return null;
  }
  const parts = days.map((r) => `${fmtDate(r.dateKey)} (${fmtEur(r.negH ?? 0, 2)} h)`);
  return {
    id: "negativpreis",
    category: "markt",
    text: `Vom ${fmtDate(WINDOW_START)} bis ${fmtDate(WINDOW_END)} lag der Preis ${fmtEur(totalH, 2)} Stunden unter null — nur ${parts.join(" und ")}.`,
    period: `${fmtDate(WINDOW_START)}–${fmtDate(WINDOW_END)}`,
    source: "Bundesnetzagentur | SMARD.de, Day-Ahead DE-LU",
    methodikHref: "/methodik#insight-negativpreis",
  };
}

function ruleGleicheSpanne(records: TagesKennzahlRecord[]): MarktInsight | null {
  const window = inHomeWindow(records).filter((r) => r.spread != null && r.pmin != null);
  for (let i = 0; i < window.length; i += 1) {
    for (let j = i + 1; j < window.length; j += 1) {
      const a = window[i];
      const b = window[j];
      if (Math.abs(a.spread! - b.spread!) <= 20 && Math.abs(a.pmin! - b.pmin!) >= 100) {
        return {
          id: "gleiche_spanne",
          category: "markt",
          text: `${fmtDate(a.dateKey)} und ${fmtDate(b.dateKey)} haben ähnliche Spannen (${fmtEur(a.spread!)} vs. ${fmtEur(b.spread!)} €/MWh), aber Minima ${fmtEur(a.pmin!)} vs. ${fmtEur(b.pmin!)} €/MWh.`,
          period: `${fmtDate(WINDOW_START)}–${fmtDate(WINDOW_END)}`,
          source: "Bundesnetzagentur | SMARD.de",
          methodikHref: "/methodik#insight-gleiche-spanne",
        };
      }
    }
  }
  return null;
}

function ruleFlotteSpitze(
  record: TagesKennzahlRecord | null,
  fleetPowerGw: number,
  absorbedGwh: number,
): MarktInsight | null {
  if (!record || record.surplusGwh >= 0.05 || record.eveningPeakGw == null) {
    return null;
  }
  if (absorbedGwh > 0.05) {
    return null;
  }
  const sharePct = (fleetPowerGw / record.eveningPeakGw) * 100;
  if (sharePct >= 15) {
    return null;
  }
  return {
    id: "flotte_spitze",
    category: "tag",
    text: `Am ${fmtDate(record.dateKey)} deckten andere Quellen um ${record.eveningPeakAt ?? "Abend"} ${fmtEur(record.eveningPeakGw, 1)} GW. Die Referenzflotte hat ${fmtEur(fleetPowerGw, 2)} GW (${fmtEur(sharePct, 1)} %); im Überschuss-Modell war nichts geladen.`,
    period: fmtDate(record.dateKey),
    source: "Energy-Charts + Battery-Charts-Referenzflotte",
    methodikHref: "/methodik#insight-flotte-spitze",
  };
}

function rulePreisRegime(records: TagesKennzahlRecord[]): MarktInsight | null {
  const window = inHomeWindow(records).filter((r) => r.pmin != null);
  let bestStart = 0;
  let bestLen = 0;
  let curStart = 0;
  let curLen = 0;
  for (let i = 0; i < window.length; i += 1) {
    if ((window[i].pmin ?? 0) >= 150) {
      if (curLen === 0) {
        curStart = i;
      }
      curLen += 1;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curLen = 0;
    }
  }
  if (bestLen < 7) {
    return null;
  }
  const from = window[bestStart].dateKey;
  const to = window[bestStart + bestLen - 1].dateKey;
  return {
    id: "preis_regime",
    category: "markt",
    text: `Vom ${fmtDate(from)} bis ${fmtDate(to)}, ${bestLen} Tage, lag jedes Tagesminimum über 150 €/MWh.`,
    period: `${fmtDate(from)}–${fmtDate(to)}`,
    source: "Bundesnetzagentur | SMARD.de, Day-Ahead DE-LU",
    methodikHref: "/methodik#insight-preis-regime",
  };
}

function ruleDreiZiele(bundle: NationalFleetMonthBundle): MarktInsight | null {
  const ue = monthStatsForRun(bundle, 1, "ueberschuss");
  const sp = monthStatsForRun(bundle, 1, "spitze");
  const mk = monthStatsForRun(bundle, 1, "markt");
  if (mk.chargeGwh <= sp.chargeGwh * 5 || mk.peakReductionGw >= 1) {
    return null;
  }
  return {
    id: "drei_ziele",
    category: "monat",
    text: `Oktober ×1: Markt bewegt ${fmtEur(mk.chargeGwh)} GWh und senkt die Spitze um ${fmtEur(mk.peakReductionGw)} GW. Spitze senken: ${fmtEur(sp.peakReductionGw)} GW bei ${fmtEur(sp.chargeGwh)} GWh. Differenz: ${fmtEur(ue.chargeGwh)} GWh, Spitze −${fmtEur(ue.peakReductionGw)} GW.`,
    period: "Oktober 2026",
    source: "Vorberechneter Monatslauf 4,58 GW / 8 GWh",
    methodikHref: "/methodik#insight-drei-ziele",
  };
}

function ruleSaettigung(overview: OverviewEvaluation | null): MarktInsight | null {
  if (!overview) {
    return null;
  }
  const x1 = overview.factors[1];
  const x10 = overview.factors[10];
  if (x1.absorbedShare == null || x10.absorbedShare == null) {
    return null;
  }
  if (x10.absorbedShare < 0.99 || x1.absorbedShare >= 0.4) {
    return null;
  }
  const period =
    overview.bounds.blick === "30tage"
      ? `${fmtDate(overview.bounds.startKey)}–${fmtDate(overview.bounds.endKey)}`
      : `${overview.bounds.dayCount} Tage`;
  return {
    id: "saettigung",
    category: "monat",
    text: `Im 30-Tage-Fenster nimmt ×1 ${formatQuantity(x1.absorbedShare * 100, "de", 0)} % des Überschusses auf, ×10 ${formatQuantity(x10.absorbedShare * 100, "de", 0)} %. Mehr Speicher sättigt den Pool, erzeugt keinen neuen Überschuss.`,
    period,
    source: "Energy-Charts + Überschuss-Kette (17:00-Grenze)",
    methodikHref: "/methodik#insight-saettigung",
  };
}

export type BuildMarktInsightsInput = {
  records: TagesKennzahlRecord[];
  fleetPowerGw: number;
  fleetEnergyGwh: number;
  focusDayKey?: string;
  overview30?: OverviewEvaluation | null;
  fleetBundle?: NationalFleetMonthBundle | null;
};

export function buildMarktInsights(input: BuildMarktInsightsInput): MarktInsight[] {
  const window = inHomeWindow(input.records);
  const focus =
    input.focusDayKey != null
      ? window.find((r) => r.dateKey === input.focusDayKey) ?? null
      : window[window.length - 1] ?? null;

  const items: MarktInsight[] = [];
  const push = (item: MarktInsight | null) => {
    if (item) {
      items.push(item);
    }
  };

  push(ruleTrockenstrecke(input.records, input.focusDayKey ?? focus?.dateKey));
  push(ruleHohesMinimum(focus));
  push(rulePreisSpike(focus));
  push(ruleNegativpreis(input.records));
  push(ruleGleicheSpanne(input.records));
  push(ruleFlotteSpitze(focus, input.fleetPowerGw, focus?.absorbedGwh ?? 0));
  push(rulePreisRegime(input.records));
  if (input.fleetBundle) {
    push(ruleDreiZiele(input.fleetBundle));
  }
  push(ruleSaettigung(input.overview30 ?? null));

  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) {
      return false;
    }
    seen.add(i.id);
    return true;
  });
}

const ROUTE_PRIORITY: Record<MarktInsightsRoute, string[]> = {
  start: ["trockenstrecke", "preis_regime", "negativpreis", "saettigung", "flotte_spitze", "hohes_minimum"],
  tag: ["hohes_minimum", "preis_spike", "flotte_spitze", "trockenstrecke", "gleiche_spanne"],
  monat: ["drei_ziele", "saettigung", "preis_regime", "negativpreis"],
  ort: ["flotte_spitze", "drei_ziele", "preis_regime"],
  methodik: [],
  beitraege: ["preis_regime", "trockenstrecke", "negativpreis"],
};

export function pickMarktInsightsForRoute(
  route: MarktInsightsRoute,
  all: MarktInsight[],
  max = 4,
): MarktInsight[] {
  const order = ROUTE_PRIORITY[route];
  const byId = new Map(all.map((i) => [i.id, i]));
  const picked: MarktInsight[] = [];
  for (const id of order) {
    const hit = byId.get(id);
    if (hit) {
      picked.push(hit);
    }
    if (picked.length >= max) {
      break;
    }
  }
  if (picked.length < max) {
    for (const item of all) {
      if (picked.some((p) => p.id === item.id)) {
        continue;
      }
      picked.push(item);
      if (picked.length >= max) {
        break;
      }
    }
  }
  return picked;
}

export function threeGoalsSummarySentence(model: ThreeGoalsCompareModel): string {
  const ue = model.rows.find((r) => r.strategy === "ueberschuss");
  const sp = model.rows.find((r) => r.strategy === "spitze");
  const mk = model.rows.find((r) => r.strategy === "markt");
  const cell = (row: ThreeGoalsStrategyRow | undefined) => row?.cells.find((c) => c.factor === 1);
  const u1 = cell(ue);
  const s1 = cell(sp);
  const m1 = cell(mk);
  if (!u1 || !s1 || !m1) {
    return "";
  }
  return `Oktober, Flotte 4,58 GW / 8 GWh, ×1: Differenz senkt ${fmtEur(u1.peakReductionGw)} GW bei ${fmtEur(u1.chargeGwh)} GWh; Spitze ${fmtEur(s1.peakReductionGw)} GW bei ${fmtEur(s1.chargeGwh)} GWh; Markt ${fmtEur(m1.chargeGwh)} GWh bei ${fmtEur(m1.peakReductionGw)} GW Spitzenwirkung.`;
}

export const MARKT_INSIGHT_RULE_IDS = [
  "trockenstrecke",
  "hohes_minimum",
  "preis_spike",
  "negativpreis",
  "gleiche_spanne",
  "flotte_spitze",
  "preis_regime",
  "drei_ziele",
  "saettigung",
] as const;
