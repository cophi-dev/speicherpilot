import { insertDisplayUnitNbsp } from "@/lib/displayUnitFormat";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  NATIONAL_REFERENCE_FLEET_ENERGY_GWH,
  NATIONAL_REFERENCE_FLEET_POWER_GW,
} from "@/lib/nationalFleetReference";
import { sliceFleetDay, type NationalFleetRunSeries } from "@/lib/nationalMonthFleetModel";

export const START_HERO_THRESHOLD_GW = 0.05;
export const START_HERO_THRESHOLD_GWH = 0.05;
export const START_HERO_LEITFRAGE = "Was hätte mehr Speicher gestern geändert?";
export const START_HERO_METHODIK_HREF = "/methodik";
export const START_HERO_METHODIK_LABEL = "siehe Methodik";

export type StartHeroV2Variant =
  | "peak_reduction"
  | "surplus_capture"
  | "market_shift"
  | "minimal_change";

export type StartHeroV2Model = {
  variant: StartHeroV2Variant;
  question: string;
  /** Antwortsatz (H1) — endet ohne Wiederholung der großen Zahl */
  answerSentence: string;
  /** Große Zahl (1 Nachkommastelle, Kopf-Stil), null bei Regel 4 (nie "31 Tage") */
  bigNumber: {
    value: string;
    unit: string;
  } | null;
  /** Label direkt unter der großen Zahl (z. B. „von 54,4 auf 51,5 GW · Spitze um 15:45“) */
  kernLine: string;
  /** Volltext der Kontextzeile inkl. „siehe Methodik“ (für Tests/Vergleich) */
  contextLine: string;
  /** Strukturierte Kontextzeile für UI-Link auf /methodik */
  contextBeforeMethodik: string;
  contextMethodikLabel: string;
  contextMethodikHref: string;
  contextAfterMethodik: string;
  metrics: {
    peakObservedGw: number;
    peakAfterGw: number;
    peakReductionGw: number;
    peakAt: string | null;
    eveningPeakReductionGw: number | null;
    daySurplusGwh: number;
    ueberschussCaptureGwh: number;
    marktDischargeGwh: number;
  };
};

export type StartHeroV2Input = {
  dayKey: string;
  spitzeRun: NationalFleetRunSeries | null;
  ueberschussRun?: NationalFleetRunSeries | null;
  marktRun?: NationalFleetRunSeries | null;
  question?: string;
  horizonLabel?: string;
  basePowerGw?: number;
  baseEnergyGwh?: number;
};

function timeHmFromBerlinIso(iso: string | undefined): string | null {
  if (!iso || iso.length < 16) return null;
  return iso.slice(11, 16);
}

function hourFromBerlinIso(iso: string | undefined): number | null {
  if (!iso || iso.length < 13) return null;
  const h = Number(iso.slice(11, 13));
  return Number.isFinite(h) ? h : null;
}

function buildContextParts(
  prefixSentences: string[],
  basePowerGw: number,
  baseEnergyGwh: number,
  horizonLabel: string,
): {
  contextLine: string;
  contextBeforeMethodik: string;
  contextMethodikLabel: string;
  contextMethodikHref: string;
  contextAfterMethodik: string;
} {
  const prefix = prefixSentences.filter(Boolean).join(" ");
  const fleetBefore = `Modellschätzung, Referenzflotte ${formatQuantity(basePowerGw, "de", 2)} GW / ${formatQuantity(baseEnergyGwh, "de", 2)} GWh (Modellbasis, `;
  const contextBeforeMethodik = insertDisplayUnitNbsp(prefix ? `${prefix} ${fleetBefore}` : fleetBefore);
  const contextAfterMethodik = `), ${horizonLabel}.`;
  return {
    contextBeforeMethodik,
    contextMethodikLabel: START_HERO_METHODIK_LABEL,
    contextMethodikHref: START_HERO_METHODIK_HREF,
    contextAfterMethodik,
    contextLine: `${contextBeforeMethodik}${START_HERO_METHODIK_LABEL}${contextAfterMethodik}`,
  };
}

/**
 * Berechnet den Startseiten-Hero v2 (Variante A) aus den ×2-Läufen eines Tages.
 * Rechnung zwingend wie monthStatsFromRunSeries / formatDayPeakKpiFromSlice:
 *   peakReductionGw = max(r_mw)/1000 − max(r_prime_mw)/1000
 * Große Zahl steht nur einmal (nicht zusätzlich im Antwortsatz).
 * Kein peakCutGw / absorbedGwh aus den Tageskennzahlen, kein Euro im Hero.
 */
export function buildStartHeroV2({
  dayKey,
  spitzeRun,
  ueberschussRun = null,
  marktRun = null,
  question = START_HERO_LEITFRAGE,
  horizonLabel = "Tageshorizont",
  basePowerGw = NATIONAL_REFERENCE_FLEET_POWER_GW,
  baseEnergyGwh = NATIONAL_REFERENCE_FLEET_ENERGY_GWH,
}: StartHeroV2Input): StartHeroV2Model {
  const spitzeSlice = spitzeRun ? sliceFleetDay(spitzeRun, dayKey) : null;
  const ueberschussSlice = ueberschussRun ? sliceFleetDay(ueberschussRun, dayKey) : null;
  const marktSlice = marktRun ? sliceFleetDay(marktRun, dayKey) : null;

  let peakObservedGw = 0;
  let peakAfterGw = 0;
  let peakReductionGw = 0;
  let peakAt: string | null = null;
  let eveningPeakReductionGw: number | null = null;
  let daySurplusGwh = 0;

  if (spitzeRun && spitzeSlice) {
    peakObservedGw = spitzeSlice.maxRMw / 1000;
    peakAfterGw = spitzeSlice.maxRPrimeMw / 1000;
    peakReductionGw = peakObservedGw - peakAfterGw;
    daySurplusGwh = spitzeSlice.windSolarSurplusMwh / 1000;

    let bestR = -Infinity;
    let bestIdx = spitzeSlice.indices[0] ?? 0;
    let evMaxR = -Infinity;
    let evMaxRp = -Infinity;
    let hasEvening = false;

    for (const idx of spitzeSlice.indices) {
      const r = spitzeRun.r_mw[idx]!;
      const rp = spitzeRun.r_prime_mw[idx]!;
      if (r > bestR) {
        bestR = r;
        bestIdx = idx;
      }
      const hour = hourFromBerlinIso(spitzeRun.timestamp_berlin[idx]);
      if (hour !== null && hour >= 17) {
        hasEvening = true;
        if (r > evMaxR) evMaxR = r;
        if (rp > evMaxRp) evMaxRp = rp;
      }
    }

    peakAt = timeHmFromBerlinIso(spitzeRun.timestamp_berlin[bestIdx]);
    if (hasEvening) {
      eveningPeakReductionGw = (evMaxR - evMaxRp) / 1000;
    }
  } else if (ueberschussSlice) {
    daySurplusGwh = ueberschussSlice.windSolarSurplusMwh / 1000;
    peakObservedGw = ueberschussSlice.maxRMw / 1000;
    peakAfterGw = ueberschussSlice.maxRPrimeMw / 1000;
  } else if (marktSlice) {
    daySurplusGwh = marktSlice.windSolarSurplusMwh / 1000;
    peakObservedGw = marktSlice.maxRMw / 1000;
    peakAfterGw = marktSlice.maxRPrimeMw / 1000;
  }

  const ueberschussCaptureGwh = ueberschussSlice ? ueberschussSlice.chargeMwh / 1000 : 0;
  const marktDischargeGwh = marktSlice ? marktSlice.dischargeMwh / 1000 : 0;

  const metrics = {
    peakObservedGw,
    peakAfterGw,
    peakReductionGw,
    peakAt,
    eveningPeakReductionGw,
    daySurplusGwh,
    ueberschussCaptureGwh,
    marktDischargeGwh,
  };

  const hasDaySurplus = daySurplusGwh >= START_HERO_THRESHOLD_GWH;
  const surplusNote = hasDaySurplus
    ? `Tagesüberschuss aus Wind und Sonne: ${formatQuantity(daySurplusGwh, "de", 1)} GWh.`
    : "Kein nationaler Überschuss aus Wind und Sonne.";

  // Füllregel 1: peakReductionGw >= 0,05 GW -> Variante A (Tagesspitze der Restlast)
  if (peakReductionGw >= START_HERO_THRESHOLD_GW) {
    const bigVal = formatQuantity(peakReductionGw, "de", 1);
    const obsVal = formatQuantity(peakObservedGw, "de", 1);
    const afterVal = formatQuantity(peakAfterGw, "de", 1);

    const kernLine = insertDisplayUnitNbsp(
      `von ${obsVal} auf ${afterVal} GW${peakAt ? ` · Spitze um ${peakAt}` : ""}`,
    );

    const contextSentences: string[] = [];
    if (
      eveningPeakReductionGw !== null &&
      Math.abs(eveningPeakReductionGw - peakReductionGw) >= START_HERO_THRESHOLD_GW
    ) {
      if (eveningPeakReductionGw >= START_HERO_THRESHOLD_GW) {
        const evVal = formatQuantity(eveningPeakReductionGw, "de", 1);
        if (evVal !== bigVal) {
          contextSentences.push(`Die Abendspitze (ab 17 Uhr) sank um ${evVal} GW.`);
        }
      } else {
        contextSentences.push("Die Abendspitze (ab 17 Uhr) blieb unverändert.");
      }
    }
    contextSentences.push(surplusNote);

    return {
      variant: "peak_reduction",
      question,
      answerSentence:
        "Eine zusätzliche Flotte in heutiger Größe, gegen die Restlastspitze gefahren, hätte die Tagesspitze der Restlast gesenkt um",
      bigNumber: { value: bigVal, unit: "GW" },
      kernLine,
      ...buildContextParts(contextSentences, basePowerGw, baseEnergyGwh, horizonLabel),
      metrics,
    };
  }

  // Füllregel 2: Senkung < 0,05 GW, Tagesüberschuss >= 0,05 GWh -> Überschuss-Fahrweise (×2)
  if (hasDaySurplus && ueberschussCaptureGwh >= START_HERO_THRESHOLD_GWH) {
    const bigVal = formatQuantity(ueberschussCaptureGwh, "de", 1);
    const peakSentence =
      peakObservedGw > 0
        ? `Tagesspitze der Restlast bei ${formatQuantity(peakObservedGw, "de", 1)} GW${peakAt ? ` (${peakAt})` : ""}.`
        : "";
    return {
      variant: "surplus_capture",
      question,
      answerSentence:
        "Eine zusätzliche Flotte in heutiger Größe hätte an Überschuss aus Wind und Sonne aufgenommen",
      bigNumber: { value: bigVal, unit: "GWh" },
      kernLine: insertDisplayUnitNbsp(
        `Überschuss-Fahrweise · Tagesüberschuss ${formatQuantity(daySurplusGwh, "de", 1)} GWh`,
      ),
      ...buildContextParts([peakSentence], basePowerGw, baseEnergyGwh, horizonLabel),
      metrics,
    };
  }

  // Füllregel 3: Beides unter Schwelle, Markt-×2 entlädt >= 0,05 GWh -> kein „gesenkt“
  if (marktDischargeGwh >= START_HERO_THRESHOLD_GWH) {
    const bigVal = formatQuantity(marktDischargeGwh, "de", 1);
    const peakSentence =
      peakObservedGw > 0
        ? `Tagesspitze der Restlast unverändert bei ${formatQuantity(peakObservedGw, "de", 1)} GW${peakAt ? ` (${peakAt})` : ""}.`
        : "";
    return {
      variant: "market_shift",
      question,
      answerSentence:
        "Eine zusätzliche Flotte in heutiger Größe hätte in teure Stunden verschoben",
      bigNumber: { value: bigVal, unit: "GWh" },
      kernLine: "die Restlastspitze blieb unverändert",
      ...buildContextParts([peakSentence, surplusNote], basePowerGw, baseEnergyGwh, horizonLabel),
      metrics,
    };
  }

  // Füllregel 4: Sonst (große Zahl nie durch „31 Tage“ ersetzen)
  const peakSentence =
    peakObservedGw > 0
      ? `Tagesspitze der Restlast bei ${formatQuantity(peakObservedGw, "de", 1)} GW${peakAt ? ` (${peakAt})` : ""}.`
      : "";
  return {
    variant: "minimal_change",
    question,
    answerSentence: "Eine zusätzliche Flotte hätte die Restlastspitze an diesem Tag kaum verändert.",
    bigNumber: null,
    kernLine: "Kaum messbare Wirkung im Tageshorizont",
    ...buildContextParts([peakSentence, surplusNote], basePowerGw, baseEnergyGwh, horizonLabel),
    metrics,
  };
}
