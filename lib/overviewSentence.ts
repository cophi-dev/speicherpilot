import { formatQuantity } from "@/lib/formatQuantity";
import type { AppLanguage } from "@/components/language-context";
import type { OverviewEvaluation } from "@/lib/overviewChain";
import type { LiveDispatchFactor } from "@/lib/liveFleetDispatch";
import { LIVE_DISPATCH_FACTORS } from "@/lib/liveFleetDispatch";
import type { OverviewBlick } from "@/lib/overviewRange";
import { weekdayShort } from "@/lib/dayRingStory";

const FULL_SOC = 0.895;

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

function periodPhrase(blick: OverviewBlick, language: AppLanguage) {
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

function sharePhrase(share: number, language: AppLanguage) {
  if (share >= FULL_SOC - 1e-6) {
    return language === "de" ? "alles" : "everything";
  }
  if (share >= 0.75 - 1e-6) {
    return language === "de" ? "vier Fünftel" : "four fifths";
  }
  if (share >= 0.55 - 1e-6) {
    return language === "de" ? "knapp drei Fünftel" : "just under three fifths";
  }
  if (share >= 0.35 - 1e-6) {
    return language === "de" ? "gut ein Drittel" : "about one third";
  }
  if (share >= 0.15 - 1e-6) {
    return language === "de" ? "knapp ein Fünftel" : "just under one fifth";
  }
  return language === "de" ? "wenig" : "little";
}

function factorLabel(factor: LiveDispatchFactor, language: AppLanguage) {
  if (factor === 1) {
    return language === "de" ? "Die heutige Speicherflotte" : "Today's storage fleet";
  }
  if (factor === 2) {
    return language === "de" ? "Zweimal so viel Speicher" : "Twice as much storage";
  }
  if (factor === 5) {
    return language === "de" ? "Fünfmal so viel Speicher" : "Five times as much storage";
  }
  return language === "de" ? "Zehnmal so viel Speicher" : "Ten times as much storage";
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
  const observed = model.observed;
  const factorResult = model.factors[factor];
  const surplus = observed.surplusGwh ?? 0;
  const dataNote =
    options?.dataStand && blick === "heute"
      ? tx(` Datenstand: ${options.dataStand}.`, ` Data as of ${options.dataStand}.`)
      : "";

  if (observed.openDay && blick === "heute") {
    const until = options?.until;
    return tx(
      `Der Tag läuft noch${until ? ` (bisher bis ${until} Uhr)` : ""}. Die Zahlen können sich noch ändern.${dataNote}`,
      `The day is still in progress${until ? ` (so far until ${until})` : ""}. Figures may still change.${dataNote}`
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
    const last = observed.lastSurplusDateBerlin
      ? tx(
          ` Zuletzt Überschuss: ${formatBerlinLong(observed.lastSurplusDateBerlin, language)}.`,
          ` Last surplus: ${formatBerlinLong(observed.lastSurplusDateBerlin, language)}.`
        )
      : "";
    return tx(
      `${periodPhrase(blick, language)} gab es keinen Überschuss. ${trade} Mehr Speicher hätte nichts geändert, weil er im Modell nur aus Überschuss lädt.${last}${dataNote}`,
      `${periodPhrase(blick, language)} there was no surplus. ${trade} More storage would not have changed anything, because the model charges only from surplus.${last}${dataNote}`
    );
  }

  const x1 = model.factors[1];
  const x2 = model.factors[2];
  const x5 = model.factors[5];
  const x10 = model.factors[10];
  const saturatedAt = LIVE_DISPATCH_FACTORS.find((step) => model.factors[step].saturated) ?? null;

  const dayPart =
    observed.surplusDays === 1
      ? tx("an 1 Tag", "on 1 day")
      : tx(`an ${observed.surplusDays} Tagen`, `on ${observed.surplusDays} days`);

  const intro = tx(
    `${periodPhrase(blick, language)} gab es ${dayPart} ${formatQuantity(surplus, language, 0)} GWh Überschuss.`,
    `${periodPhrase(blick, language)} there was ${dayPart} ${formatQuantity(surplus, language, 0)} GWh of surplus.`
  );

  const fleetParts = [
    `${factorLabel(1, language)} hätte ${sharePhrase(x1.absorbedShare ?? 0, language)} davon aufgenommen (${formatQuantity(x1.absorbedGwh, language, 1)} GWh)`,
    `${factorLabel(5, language)} ${sharePhrase(x5.absorbedShare ?? 0, language)} (${formatQuantity(x5.absorbedGwh, language, 1)} GWh)`,
    `${factorLabel(10, language)} ${sharePhrase(x10.absorbedShare ?? 0, language)} (${formatQuantity(x10.absorbedGwh, language, 1)} GWh)`,
  ];

  if (saturatedAt !== null && saturatedAt <= factor) {
    return tx(
      `${intro} Ab ×${saturatedAt} nimmt der Speicher im Modell den gesamten Überschuss auf — mehr Speicher bringt in diesem Zeitraum nichts.${dataNote}`,
      `${intro} From ×${saturatedAt} the model fleet absorbs all surplus — more storage would not help further in this period.${dataNote}`
    );
  }

  const current = factorResult.absorbedShare ?? 0;
  if (factor === 1 && current < 0.5 - 1e-6) {
    return tx(
      `${intro} ${fleetParts.join(", ")}.${dataNote}`,
      `${intro} ${factorLabel(1, language)} would have absorbed ${sharePhrase(current, language)} (${formatQuantity(x1.absorbedGwh, language, 1)} GWh); ×5 ${formatQuantity(x5.absorbedGwh, language, 1)} GWh; ×10 ${formatQuantity(x10.absorbedGwh, language, 1)} GWh.${dataNote}`
    );
  }

  if (factor > 1) {
    return tx(
      `${intro} Bei ×${factor} hätte der Speicher ${sharePhrase(current, language)} aufgenommen (${formatQuantity(factorResult.absorbedGwh, language, 1)} GWh). ×1: ${formatQuantity(x1.absorbedGwh, language, 1)} GWh, ×2: ${formatQuantity(x2.absorbedGwh, language, 1)} GWh.${dataNote}`,
      `${intro} At ×${factor} storage would have absorbed ${sharePhrase(current, language)} (${formatQuantity(factorResult.absorbedGwh, language, 1)} GWh). ×1: ${formatQuantity(x1.absorbedGwh, language, 1)} GWh; ×2: ${formatQuantity(x2.absorbedGwh, language, 1)} GWh.${dataNote}`
    );
  }

  return tx(`${intro} ${fleetParts.join(", ")}.${dataNote}`, `${intro} ${fleetParts.join(", ")}.${dataNote}`);
}
