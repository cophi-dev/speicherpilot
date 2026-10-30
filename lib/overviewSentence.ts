import { formatQuantity } from "@/lib/formatQuantity";
import type { AppLanguage } from "@/components/language-context";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import type { LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import type { OverviewBlick } from "@/lib/overviewRange";
import { weekdayShort } from "@/lib/dayRingStory";

/** Share at or above this counts as absorbing all surplus in phrasing. */
export const SATURATION = 0.995;

const FRACTION_BANDS: Array<{ value: number; de: string; en: string }> = [
  { value: 1 / 10, de: "ein Zehntel", en: "one tenth" },
  { value: 1 / 5, de: "ein Fünftel", en: "one fifth" },
  { value: 1 / 4, de: "ein Viertel", en: "one quarter" },
  { value: 1 / 3, de: "ein Drittel", en: "one third" },
  { value: 2 / 5, de: "zwei Fünftel", en: "two fifths" },
  { value: 1 / 2, de: "die Hälfte", en: "half" },
  { value: 3 / 5, de: "drei Fünftel", en: "three fifths" },
  { value: 2 / 3, de: "zwei Drittel", en: "two thirds" },
  { value: 3 / 4, de: "drei Viertel", en: "three quarters" },
  { value: 4 / 5, de: "vier Fünftel", en: "four fifths" },
  { value: 9 / 10, de: "neun Zehntel", en: "nine tenths" },
];

function formatBerlinLong(dateKey: string, language: AppLanguage) {
  const [year, month, day] = dateKey.split("-");
  if (language === "de") {
    const months = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ];
    const m = Number(month);
    return `${weekdayShort(dateKey, language)}, ${Number(day)}. ${months[m - 1] ?? month} ${year}`;
  }
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatBerlinShort(dateKey: string, language: AppLanguage) {
  if (language === "de") {
    return `${weekdayShort(dateKey, language)}, ${dateKey.slice(8, 10)}.${dateKey.slice(5, 7)}.`;
  }
  return formatBerlinLong(dateKey, language);
}

function periodPhrase(blick: OverviewBlick | "tag", language: AppLanguage, tagDateKey?: string) {
  if (blick === "tag" && tagDateKey) {
    return language === "de" ? `Am ${formatBerlinLong(tagDateKey, language)}` : `On ${formatBerlinLong(tagDateKey, language)}`;
  }
  if (language === "en") {
    if (blick === "heute") return "Today";
    if (blick === "gestern") return "Yesterday";
    if (blick === "7tage") return "In the last 7 days";
    return "In the last 30 days";
  }
  if (blick === "heute") return "Heute";
  if (blick === "gestern") return "Gestern";
  if (blick === "7tage") return "In den letzten 7 Tagen";
  return "In den letzten 30 Tagen";
}

function nearestFractionBand(share: number) {
  let best = FRACTION_BANDS[0];
  let bestDist = Math.abs(share - best.value);
  for (const band of FRACTION_BANDS) {
    const dist = Math.abs(share - band.value);
    if (dist < bestDist - 1e-9) {
      best = band;
      bestDist = dist;
    }
  }
  return best;
}

function fractionPhraseCore(share: number, language: AppLanguage): string {
  const band = nearestFractionBand(share);
  const qualifier =
    share + 1e-6 < band.value
      ? language === "de"
        ? "knapp "
        : "just under "
      : share > band.value + 1e-6
        ? language === "de"
          ? "gut "
          : "about "
        : "";
  const core = language === "de" ? band.de : band.en;
  return `${qualifier}${core}`;
}

function sharePctThin(share: number, language: AppLanguage): string {
  const pct = formatQuantity(share * 100, language, 0);
  return language === "de" ? `${pct}\u202F%` : `${pct}%`;
}

export function sharePhrase(share: number, language: AppLanguage) {
  if (share <= 1e-6) {
    return language === "de" ? "nichts" : "nothing";
  }
  if (share >= SATURATION - 1e-6) {
    return language === "de" ? "alles" : "everything";
  }
  const pctUnit = sharePctThin(share, language);
  if (share < 0.15 - 1e-6) {
    return language === "de" ? `wenig (${pctUnit})` : `little (${pctUnit})`;
  }
  return `${fractionPhraseCore(share, language)} (${pctUnit})`;
}

function uptakeWord(share: number, language: AppLanguage): string {
  if (share <= 1e-6) {
    return language === "de" ? "nichts" : "nothing";
  }
  if (share >= SATURATION - 1e-6) {
    return language === "de" ? "alles" : "everything";
  }
  if (share < 0.15 - 1e-6) {
    return language === "de" ? "wenig" : "little";
  }
  return fractionPhraseCore(share, language);
}

function uptakePhrase(absorbedGwh: number, absorbedShare: number | null, language: AppLanguage): string {
  const share = absorbedShare ?? 0;
  const word = uptakeWord(share, language);
  const pctUnit = sharePctThin(share, language);
  const gwh = formatQuantity(absorbedGwh, language, 1);
  if (language === "de") {
    return `${word} (${pctUnit}, ${gwh}\u202FGWh)`;
  }
  return `${word} (${pctUnit}, ${gwh} GWh)`;
}

function factorLabel(factor: LiveDispatchFactor, language: AppLanguage) {
  if (factor === 1) {
    return language === "de" ? "Die heutige Speicherflotte" : "Today's storage fleet";
  }
  if (factor === 2) {
    return language === "de" ? "Zweimal so viel Speicher" : "Twice as much storage";
  }
  if (factor === 5) {
    return language === "de" ? "fünfmal so viel Speicher" : "five times as much storage";
  }
  return language === "de" ? "zehnmal so viel Speicher" : "ten times as much storage";
}

function showLastSurplus(lastDate: string | null, boundsEndKey: string) {
  return Boolean(lastDate && lastDate < boundsEndKey);
}

/**
 * One plain-language assessment for the overview (Start) or a single day.
 */
export function einschaetzung(
  model: OverviewEvaluation,
  factor: LiveDispatchFactor,
  language: AppLanguage,
  options?: { dataStand?: string; until?: string | null }
): string {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const blick = model.bounds.blick;
  const tagDateKey = blick === "tag" ? model.bounds.startKey : undefined;
  const observed = model.observed;
  const factorResult = model.factors[factor];
  const surplus = observed.surplusGwh ?? 0;
  const dataNote =
    options?.dataStand && blick === "heute"
      ? tx(` Datenstand: ${options.dataStand}.`, ` Data as of ${options.dataStand}.`)
      : "";

  if (observed.openDay && blick === "heute" && surplus <= 1e-6) {
    const until = options?.until;
    const last =
      observed.lastSurplusDateBerlin && showLastSurplus(observed.lastSurplusDateBerlin, model.bounds.endKey)
        ? tx(
            ` Zuletzt Überschuss: ${formatBerlinShort(observed.lastSurplusDateBerlin, language)}`,
            ` Last surplus: ${formatBerlinShort(observed.lastSurplusDateBerlin, language)}`
          )
        : "";
    return tx(
      `Heute bisher kein Überschuss${until ? ` (bis ${until})` : ""}.${last}${dataNote}`,
      `No surplus so far today${until ? ` (until ${until})` : ""}.${last}${dataNote}`
    );
  }

  if (surplus <= 1e-6) {
    const netImport = observed.netImportGwh;
    const trade =
      netImport !== null && netImport >= 0
        ? tx(
            `Deutschland hat ${formatQuantity(Math.abs(netImport), language, 1)} GWh Strom eingekauft.`,
            `Germany bought ${formatQuantity(Math.abs(netImport), language, 1)} GWh of electricity.`
          )
        : netImport !== null
          ? tx(
              `Deutschland hat ${formatQuantity(Math.abs(netImport), language, 1)} GWh Strom verkauft.`,
              `Germany sold ${formatQuantity(Math.abs(netImport), language, 1)} GWh of electricity.`
            )
          : tx("Es gab keinen Überschuss aus Wind und Sonne.", "There was no wind-and-solar surplus.");
    const last =
      observed.lastSurplusDateBerlin && showLastSurplus(observed.lastSurplusDateBerlin, model.bounds.endKey)
        ? tx(
            ` Zuletzt Überschuss: ${formatBerlinLong(observed.lastSurplusDateBerlin, language)}.`,
            ` Last surplus: ${formatBerlinLong(observed.lastSurplusDateBerlin, language)}.`
          )
        : "";
    const lead = periodPhrase(blick, language, tagDateKey);
    return tx(
      `${lead} gab es keinen Überschuss. ${trade} Mehr Speicher hätte nichts geändert, weil er im Modell nur aus Überschuss lädt.${last}${dataNote}`,
      `${lead} there was no surplus. ${trade} More storage would not have changed anything, because the model charges only from surplus.${last}${dataNote}`
    );
  }

  const x1 = model.factors[1];
  const x5 = model.factors[5];
  const x10 = model.factors[10];
  const saturatedAt = LIVE_DISPATCH_FACTORS.find((step) => model.factors[step].saturated) ?? null;

  const dayPart =
    blick === "tag"
      ? ""
      : observed.surplusDays === 1
        ? tx("an 1 Tag ", "on 1 day ")
        : tx(`an ${observed.surplusDays} Tagen `, `on ${observed.surplusDays} days `);

  const introLead = periodPhrase(blick, language, tagDateKey);
  const surplusDigits = blick === "tag" ? 1 : 0;
  const intro = tx(
    `${introLead} gab es ${dayPart}${formatQuantity(surplus, language, surplusDigits)} GWh Überschuss.`,
    `${introLead} there was ${dayPart}${formatQuantity(surplus, language, surplusDigits)} GWh of surplus.`
  );

  const fleetParts = [
    `${factorLabel(1, language)} hätte ${uptakePhrase(x1.absorbedGwh, x1.absorbedShare, language)} davon aufgenommen`,
    `${factorLabel(5, language)} ${uptakePhrase(x5.absorbedGwh, x5.absorbedShare, language)}`,
    `${factorLabel(10, language)} ${uptakePhrase(x10.absorbedGwh, x10.absorbedShare, language)}`,
  ];

  if (saturatedAt !== null && saturatedAt <= factor) {
    const periodTail =
      blick === "tag"
        ? tx("an diesem Tag nichts", "on this day")
        : tx("in diesem Zeitraum nichts", "in this period");
    return tx(
      `${intro} Ab ×${saturatedAt} nimmt der Speicher im Modell den gesamten Überschuss auf — mehr Speicher bringt ${periodTail}.${dataNote}`,
      `${intro} From ×${saturatedAt} the model fleet absorbs all surplus — more storage would not help further ${blick === "tag" ? "on this day" : "in this period"}.${dataNote}`
    );
  }

  const current = factorResult.absorbedShare ?? 0;
  if (factor === 1 && current < 0.5 - 1e-6) {
    return tx(`${intro} ${fleetParts.join(", ")}.${dataNote}`, `${intro} ${fleetParts.join(", ")}.${dataNote}`);
  }

  if (factor > 1) {
    return tx(
      `${intro} Bei ×${factor} hätte der Speicher ${uptakePhrase(factorResult.absorbedGwh, factorResult.absorbedShare, language)} aufgenommen.${dataNote}`,
      `${intro} At ×${factor} storage would have absorbed ${uptakePhrase(factorResult.absorbedGwh, factorResult.absorbedShare, language)}.${dataNote}`
    );
  }

  return tx(`${intro} ${fleetParts.join(", ")}.${dataNote}`, `${intro} ${fleetParts.join(", ")}.${dataNote}`);
}
