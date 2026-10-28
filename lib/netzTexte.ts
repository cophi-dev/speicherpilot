import type { AppLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import {
  N1_CASES,
  NOMINAL_KV,
  TIP_CAP_MW,
  VOLTAGE_BAND,
  type DerivedLimits,
  type NetzFall,
  type NetzNodeId,
  type NetzRichtung,
} from "@/lib/netzDemo";

export const CASE_LABEL: Record<NetzFall, { de: string; en: string }> = {
  hL: { de: "Starklast", en: "peak load" },
  lPV: { de: "Schwachlast mit Sonne und Wind", en: "low load with sun and wind" },
};

export const DIRECTION_LABEL: Record<NetzRichtung, { de: string; en: string }> = {
  laden: { de: "Laden", en: "charging" },
  entladen: { de: "Entladen", en: "discharging" },
};

export const NODE_LABEL: Record<NetzNodeId, { de: string; en: string }> = {
  A: { de: "Sammelschiene im Umspannwerk", en: "busbar at the substation" },
  B: { de: "nah am Umspannwerk", en: "close to the substation" },
  C: { de: "mittlere Entfernung", en: "medium distance" },
  D: { de: "Ende eines langen Abgangs", en: "end of a long feeder" },
};

const LAST_SENTENCE = {
  de: "Testnetz, kein reales Netz. Modellergebnis, keine Aussage über ein reales Netz.",
  en: "Test grid, not a real grid. Model result, no statement about a real grid.",
} as const;

export function pair(language: AppLanguage, text: { de: string; en: string }): string {
  return language === "de" ? text.de : text.en;
}

export function formatPu(value: number, language: AppLanguage): string {
  return formatQuantity(value, language, 4);
}

export function formatPct(value: number, language: AppLanguage): string {
  return formatQuantity(value, language, 1);
}

export function formatMw(value: number, language: AppLanguage, digits = 3): string {
  return formatQuantity(value, language, digits);
}

export function formatOhm(value: number, language: AppLanguage): string {
  return formatQuantity(value, language, 2);
}

export function formatTip(value: number, language: AppLanguage): string {
  return formatQuantity(value, language, 1);
}

export function kvFromPu(pu: number): number {
  return pu * NOMINAL_KV;
}

export function statusSentences(language: AppLanguage, derived: DerivedLimits): string[] {
  if (!derived.converged) {
    return [
      language === "de"
        ? "Der Lastfluss konvergiert nicht. Das Modell findet für diese Leistung an diesem Knoten keinen Betriebspunkt; das gilt als Grenzverletzung. Es wird kein Zahlenwert angezeigt."
        : "The load flow does not converge. The model finds no operating point for this power at this node; this counts as a limit violation. No figures are shown.",
    ];
  }
  const sentences: string[] = [];
  if (derived.ok) {
    sentences.push(language === "de" ? "Innerhalb der angenommenen Grenzen." : "Within the assumed limits.");
  }
  if (derived.voltage) {
    sentences.push(
      language === "de"
        ? `Spannung außerhalb des angenommenen Bandes (${formatPu(VOLTAGE_BAND.min, language)} bis ${formatPu(VOLTAGE_BAND.max, language)} p.u.).`
        : `Voltage outside the assumed band (${formatPu(VOLTAGE_BAND.min, language)} to ${formatPu(VOLTAGE_BAND.max, language)} p.u.).`
    );
  }
  if (derived.loading) {
    sentences.push(
      language === "de"
        ? "Mindestens eine Leitung oder ein Transformator über 100 % Auslastung."
        : "At least one line or transformer above 100 % loading."
    );
  }
  return sentences;
}

function tipSentence(language: AppLanguage, tip: number): string {
  if (tip >= TIP_CAP_MW) {
    return language === "de"
      ? "Dieser Knoten hält im Normalbetrieb bis mindestens 100 MW (Rechengrenze)."
      : "This node holds in normal operation up to at least 100 MW (calculation limit).";
  }
  const value = formatTip(tip, language);
  return language === "de"
    ? `Dieser Knoten hält im Normalbetrieb bis etwa ${value} MW.`
    : `This node holds in normal operation up to about ${value} MW.`;
}

function extremeVoltage(vmin: number, vmax: number): number {
  const under = Math.max(0, VOLTAGE_BAND.min - vmin);
  const over = Math.max(0, vmax - VOLTAGE_BAND.max);
  return over > under ? vmax : vmin;
}

export function plainText(input: {
  language: AppLanguage;
  basis: boolean;
  fall: NetzFall;
  richtung: NetzRichtung;
  knoten: NetzNodeId;
  pMw: number;
  derived: DerivedLimits;
  vmin?: number;
  vmax?: number;
  lineMax?: number;
  baseLine?: number;
  tip: number;
}): string[] {
  const { language } = input;
  const fall = pair(language, CASE_LABEL[input.fall]);
  const direction = pair(language, DIRECTION_LABEL[input.richtung]);
  const node = `${language === "de" ? "Knoten" : "node"} ${input.knoten}, ${pair(language, NODE_LABEL[input.knoten])}`;
  const sentences: string[] = [];
  if (input.basis && input.derived.converged && input.vmin != null && input.vmax != null && input.lineMax != null) {
    sentences.push(
      language === "de"
        ? `Ohne Speicher bleiben im Testnetz bei ${fall} alle Spannungen zwischen ${formatPu(input.vmin, language)} und ${formatPu(input.vmax, language)} p.u., die höchste Leitung ist zu ${formatPct(input.lineMax, language)} % ausgelastet.`
        : `Without storage, in the test grid at ${fall}, all voltages stay between ${formatPu(input.vmin, language)} and ${formatPu(input.vmax, language)} p.u., and the highest line loading is ${formatPct(input.lineMax, language)} %.`
    );
  } else if (!input.derived.converged) {
    sentences.push(
      language === "de"
        ? `Mit ${formatQuantity(input.pMw, language, 0)} MW ${direction} an ${node} findet der Lastfluss keinen Betriebspunkt.`
        : `With ${formatQuantity(input.pMw, language, 0)} MW ${direction} at ${node}, the load flow finds no operating point.`
    );
    sentences.push(tipSentence(language, input.tip));
  } else if (input.derived.ok && input.lineMax != null && input.baseLine != null) {
    sentences.push(
      language === "de"
        ? `Mit ${formatQuantity(input.pMw, language, 0)} MW ${direction} an ${node} bleibt im Testnetz alles innerhalb der angenommenen Grenzen. Die höchste Leitungsauslastung liegt bei ${formatPct(input.lineMax, language)} % (ohne Speicher ${formatPct(input.baseLine, language)} %). ${tipSentence(language, input.tip)}`
        : `With ${formatQuantity(input.pMw, language, 0)} MW ${direction} at ${node}, everything in the test grid stays within the assumed limits. The highest line loading is ${formatPct(input.lineMax, language)} % (without storage ${formatPct(input.baseLine, language)} %). ${tipSentence(language, input.tip)}`
    );
  } else if (input.vmin != null && input.vmax != null && input.lineMax != null) {
    const parts: string[] = [];
    if (input.derived.voltage) {
      const extreme = extremeVoltage(input.vmin, input.vmax);
      parts.push(
        language === "de"
          ? `die Spannung außerhalb des angenommenen Bandes (${formatPu(extreme, language)} p.u.)`
          : `the voltage outside the assumed band (${formatPu(extreme, language)} p.u.)`
      );
    }
    if (input.derived.loading) {
      parts.push(
        language === "de"
          ? `mindestens eine Leitung bei ${formatPct(input.lineMax, language)} % Auslastung`
          : `at least one line at ${formatPct(input.lineMax, language)} % loading`
      );
    }
    const joined = language === "de" ? parts.join(" und ") : parts.join(" and ");
    sentences.push(
      language === "de"
        ? `Mit ${formatQuantity(input.pMw, language, 0)} MW ${direction} an ${node} liegt im Testnetz ${joined}. ${tipSentence(language, input.tip)}`
        : `With ${formatQuantity(input.pMw, language, 0)} MW ${direction} at ${node}, the test grid has ${joined}. ${tipSentence(language, input.tip)}`
    );
  }
  sentences.push(LAST_SENTENCE[language]);
  return sentences;
}

export function outageComparison(input: {
  language: AppLanguage;
  baseFailed: number;
  failed: number;
  newly: number;
  noLonger: number;
}): string {
  const { language } = input;
  return language === "de"
    ? `Ohne Speicher verletzen ${input.baseFailed} von ${123} Einzelausfällen die Grenzen. Mit Speicher sind es ${input.failed}. Neu betroffen: ${input.newly}. Nicht mehr betroffen: ${input.noLonger}.`
    : `Without storage, ${input.baseFailed} of 123 single outages violate the limits. With storage it is ${input.failed}. Newly affected: ${input.newly}. No longer affected: ${input.noLonger}.`;
}

export function outageBasis(language: AppLanguage, baseFailed: number): string {
  return language === "de"
    ? `Ohne Speicher verletzen ${baseFailed} von 123 Einzelausfällen die Grenzen. Es ist kein Speicher gesetzt.`
    : `Without storage, ${baseFailed} of 123 single outages violate the limits. No storage is connected.`;
}

export function outageSkipped(language: AppLanguage): string {
  return language === "de"
    ? "(n-1) wird nicht gerechnet, weil der Normalbetrieb schon Grenzen verletzt."
    : "(n-1) is not calculated, because normal operation already violates the limits.";
}

export function outageMemory(language: AppLanguage, baseFailed: number): string {
  return language === "de"
    ? `Auch ohne Speicher erfüllt das Testnetz die (n-1)-Grenzen für ${baseFailed} Fälle nicht. Das ist ein Merkmal dieses Lehrnetzes, keine Aussage über reale Netze.`
    : `Even without storage, the test grid misses the (n-1) limits in ${baseFailed} cases. That is a property of this teaching grid, not a statement about real grids.`;
}

export function outageModel(language: AppLanguage): string {
  return language === "de"
    ? "Gerechnet wird der Ausfall je einer Leitung oder eines Transformators. Ist das Ergebnis verletzt, sucht der Code die beste einzelne Zusatzschaltung: eine offene Trennstelle schließen. Liegt es danach noch außerhalb, kann er zusätzlich eine Leitung in der entstandenen Schleife öffnen."
    : "The calculation removes one line or one transformer at a time. If the result violates the limits, the code looks for the best single extra switching step: closing one open tie switch. If it is still outside, it can also open one line in the loop that then appears.";
}

export function limitsItems(language: AppLanguage): string[] {
  if (language === "de") {
    return [
      "Gerechnet wird ein öffentliches Lehr-Testnetz (SimBench, halbstädtisch, 20 kV). Es ist kein reales Netz; die Ergebnisse sagen nichts über Netze von Netzbetreibern.",
      "Es gibt zwei Lastfälle: Starklast und Schwachlast mit Sonne und Wind. Der Stufensteller des Transformators ist je Fall fest eingestellt, es gibt keine Spannungsregelung.",
      "Der Speicher wird nur mit Wirkleistung gerechnet, bei einem Leistungsfaktor von 1, ohne Wirkungsgrad, ohne Ladezustand und ohne Blindleistungsregelung.",
      "Kurzschlussströme werden hier nicht gerechnet; dafür fehlen im Testnetz die Daten des vorgelagerten Netzes. Spannungsqualität (Flicker, Oberschwingungen) und Zeitverläufe werden nicht gerechnet.",
      "(n-1) ist ein vereinfachtes Lehrmodell: ein Einzelausfall. Danach kann der Code eine offene Trennstelle schließen. Ist das Ergebnis noch verletzt, kann er zusätzlich eine Leitung in der entstandenen Schleife öffnen. Es bleibt die beste dieser Einzelschaltungen.",
      "Das Ergebnis ist kein Netzanschlussbescheid und keine Zusage.",
      "Normalbetrieb und Kipppunkte wurden vorab mit pandapower berechnet und mit einem zweiten, unabhängigen Rechner gegengeprüft. (n-1) ist stichprobenartig geprüft.",
    ];
  }
  return [
    "The calculation uses a public teaching grid (SimBench, semi-urban, 20 kV). It is not a real grid; the results say nothing about grids of network operators.",
    "There are two load cases: peak load, and low load with sun and wind. The transformer tap is fixed for each case. There is no voltage control.",
    "Storage is calculated with active power only, at a power factor of 1, without efficiency, without state of charge and without reactive-power control.",
    "Short-circuit currents are not calculated here; the test grid lacks the data of the upstream grid. Voltage quality (flicker, harmonics) and time series are not calculated.",
    "(n-1) is a simplified teaching model: one single outage. The code can then close one open tie switch. If the result is still violated, it can also open one line in the loop that appears. The best of these single switching steps is kept.",
    "The result is not a grid-connection decision and not a commitment.",
    "Normal operation and tipping points were calculated in advance with pandapower and checked with a second, independent solver. (n-1) was checked on a sample.",
  ];
}

export function odblNotice(language: AppLanguage): string {
  return language === "de"
    ? "Enthält Informationen aus der SimBench-Datenbank (simbench.de), die unter der Open Database License (ODbL) 1.0 bereitgestellt wird. Berechnet mit pandapower."
    : "Contains information from the SimBench database (simbench.de), which is made available here under the Open Database License (ODbL) 1.0. Calculated with pandapower.";
}

export function odblAttribution(language: AppLanguage): string {
  return language === "de"
    ? "SimBench: Universität Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE. pandapower: Universität Kassel, Fraunhofer IEE und Mitwirkende, BSD-3-Clause."
    : "SimBench: University of Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE. pandapower: University of Kassel, Fraunhofer IEE and contributors, BSD-3-Clause.";
}

export function lineKind(kind: string, language: AppLanguage): string {
  if (kind === "cs") {
    return language === "de" ? "Kabel" : "cable";
  }
  if (kind === "ol") {
    return language === "de" ? "Freileitung" : "overhead line";
  }
  return kind;
}

/** Untergrenze der Spannung im Einzelausfall, wie in der Methodik. Nur für den Lesetext. */
const OUTAGE_VOLTAGE_MIN = 0.915;
const LINES_34_TO_38 = [34, 35, 36, 37, 38] as const;

export type ScenarioChipId = "netzdienlich" | "zu-viel" | "belastungstest" | "gegenprobe" | "grenze";

const CHIP_LABEL: Record<ScenarioChipId, { de: string; en: string }> = {
  netzdienlich: { de: "netzdienlich", en: "grid-serving" },
  "zu-viel": { de: "zu viel des Guten", en: "too much of a good thing" },
  belastungstest: { de: "Belastungstest", en: "stress test" },
  gegenprobe: { de: "Gegenprobe", en: "cross-check" },
  grenze: { de: "Grenze", en: "limit" },
};

function chipText(language: AppLanguage, id: ScenarioChipId): string {
  return pair(language, CHIP_LABEL[id]);
}

function fittingMode(fall: NetzFall, richtung: NetzRichtung): boolean {
  return (fall === "lPV" && richtung === "laden") || (fall === "hL" && richtung === "entladen");
}

export function scenarioEinordnung(input: {
  language: AppLanguage;
  fall: NetzFall;
  richtung: NetzRichtung;
  pMw: number;
  derived: DerivedLimits;
  outagesWithout: number | null;
  outagesWith: number | null;
}): { id: ScenarioChipId; chip: string; sentence: string } | null {
  if (input.pMw <= 0) {
    return null;
  }
  const { language } = input;
  if (!input.derived.converged) {
    return {
      id: "grenze",
      chip: chipText(language, "grenze"),
      sentence:
        language === "de"
          ? "Am Ende eines langen Abgangs gibt es hier keinen Betriebspunkt mehr, der letzte lösbare Punkt steht in der Zeile darunter."
          : "At the end of a long feeder there is no operating point left. The last point that still solves is in the line below.",
    };
  }
  if (fittingMode(input.fall, input.richtung)) {
    const withoutCount = input.outagesWithout;
    const withCount = input.outagesWith;
    if (input.derived.ok && withoutCount != null && withCount != null && withCount <= withoutCount) {
      const without = formatQuantity(withoutCount, language, 0);
      const withStorage = formatQuantity(withCount, language, 0);
      return {
        id: "netzdienlich",
        chip: chipText(language, "netzdienlich"),
        sentence:
          language === "de"
            ? `Der Speicher nimmt Überschuss auf bzw. gibt in der Spitze ab: das entlastet das Netz (Modell). Ausfälle ohne Speicher: ${without}, mit Speicher: ${withStorage}.`
            : `The storage takes in surplus, or feeds it out at the peak: that eases the grid (model). Outages without storage: ${without}, with storage: ${withStorage}.`,
      };
    }
    return {
      id: "zu-viel",
      chip: chipText(language, "zu-viel"),
      sentence:
        language === "de"
          ? "Zu viel Leistung kippt auch den guten Fall."
          : "Too much power also tips the helpful case.",
    };
  }
  if (input.fall === "hL" && input.richtung === "laden") {
    return {
      id: "belastungstest",
      chip: chipText(language, "belastungstest"),
      sentence:
        language === "de"
          ? "Ein Speicher, der netzdienlich fährt, lädt in der Spitzenlast nicht. Dieses Szenario zeigt, wo die Grenze liegt, wenn er nach dem Markt lädt, zum Beispiel bei niedrigem Preis zur falschen Zeit."
          : "Storage that runs in a grid-serving way does not charge at peak load. This scenario shows where the limit lies when it charges with the market, for example at a low price at the wrong time.",
    };
  }
  if (input.fall === "lPV" && input.richtung === "entladen") {
    return {
      id: "gegenprobe",
      chip: chipText(language, "gegenprobe"),
      sentence:
        language === "de"
          ? "Falsche Richtung bei Überschuss: zeigt, dass der Ort und der Strang das Ergebnis mitbestimmen, nicht nur die Richtung."
          : "Wrong direction during surplus: the place and the feeder shape the result, not only the direction.",
    };
  }
  return null;
}

export function readResultGuide(language: AppLanguage): {
  title: string;
  limitQuestion: string;
  limitLead: string;
  limitTail: string;
  whereQuestion: string;
  where: string;
  outageQuestion: string;
  outageTail: string;
} {
  const min = formatQuantity(VOLTAGE_BAND.min, language, 3);
  const max = formatQuantity(VOLTAGE_BAND.max, language, 3);
  const outageMin = formatQuantity(OUTAGE_VOLTAGE_MIN, language, 3);
  if (language === "de") {
    return {
      title: "So liest du das Ergebnis",
      limitQuestion: "Wird eine Grenze verletzt?",
      limitLead: `Die Spannung muss zwischen ${min} und ${max} p.u. bleiben`,
      limitTail: ` (im Ausfall ${outageMin} bis ${max}). Keine Leitung über 100 % Auslastung.`,
      whereQuestion: "Wo?",
      where:
        "Der Knoten oder die Leitung mit dem Engpass. Der Strom nimmt den Weg vom Umspannwerk (Sammelschiene) zum Speicher, deshalb fällt zuerst dieser Weg auf.",
      outageQuestion: "Was passiert beim Ausfall?",
      outageTail: `: Es fällt je eine der ${N1_CASES} Leitungen oder Trafos aus, das Netz muss weiter versorgen. Gezählt wird, bei wie vielen von ${N1_CASES} Ausfällen eine Grenze reißt.`,
    };
  }
  return {
    title: "How to read the result",
    limitQuestion: "Is a limit crossed?",
    limitLead: `Voltage must stay between ${min} and ${max} p.u.`,
    limitTail: ` (in an outage ${outageMin} to ${max}). No line above 100 % loading.`,
    whereQuestion: "Where?",
    where:
      "The node or the line with the bottleneck. The current takes the path from the substation (busbar) to the storage, so that path shows up first.",
    outageQuestion: "What happens in an outage?",
    outageTail: `: one of the ${N1_CASES} lines or transformers drops out at a time, and the grid must keep supplying. The count is how many of the ${N1_CASES} outages break a limit.`,
  };
}

function isLineSet3438(ids: number[]): boolean {
  if (ids.length !== LINES_34_TO_38.length) {
    return false;
  }
  const sorted = [...ids].sort((a, b) => a - b);
  return LINES_34_TO_38.every((id, index) => sorted[index] === id);
}

function directionVerb(text: string, richtung: NetzRichtung, language: AppLanguage): string {
  if (richtung === "laden") {
    return text;
  }
  return language === "de" ? text.replace("lädt", "einspeist") : text.replace("charges", "feeds in");
}

export function newLineExplanation(input: {
  language: AppLanguage;
  richtung: NetzRichtung;
  lineIds: number[];
  onPath: boolean;
  allCables: boolean;
}): string | null {
  if (input.lineIds.length === 0 || !input.onPath) {
    return null;
  }
  const { language, richtung } = input;
  if (isLineSet3438(input.lineIds) && input.allCables) {
    const text =
      language === "de"
        ? "Die Leitungen, die neu auffallen, liegen genau auf dem Weg zwischen Umspannwerk und Speicher. Wenn der Speicher lädt, fließt seine ganze Leistung über diese Kabel (5 MW sind bei 20 kV etwa 144 A, die Kabel sind für 220 A ausgelegt). Fällt eine davon aus, muss der Nachbarstrang die Versorgung über die offene Trennstelle übernehmen, und der schafft die zusätzliche Leistung nicht. Das ist kein Fehler im Modell, sondern genau die Frage bei einem neuen Anschluss: Hält der Ausweichweg?"
        : "The lines that show up as new lie exactly on the path between the substation and the storage. When the storage charges, all of its power flows over these cables (5 MW at 20 kV is about 144 A, and the cables are rated for 220 A). If one of them fails, the neighbouring feeder has to carry the supply across the open tie switch, and it cannot take the extra power. That is not a fault in the model. It is the question that comes with a new connection: does the backup path hold?";
    return directionVerb(text, richtung, language);
  }
  const cable = input.allCables
    ? language === "de"
      ? "diese Kabel"
      : "these cables"
    : language === "de"
      ? "diese Leitungen"
      : "these lines";
  const text =
    language === "de"
      ? `Die Leitungen, die neu auffallen, liegen genau auf dem Weg zwischen Umspannwerk und Speicher. Wenn der Speicher lädt, fließt seine ganze Leistung über ${cable}. Fällt eine davon aus, muss der Nachbarstrang die Versorgung über die offene Trennstelle übernehmen, und der schafft die zusätzliche Leistung nicht. Das ist kein Fehler im Modell, sondern genau die Frage bei einem neuen Anschluss: Hält der Ausweichweg?`
      : `The lines that show up as new lie exactly on the path between the substation and the storage. When the storage charges, all of its power flows over ${cable}. If one of them fails, the neighbouring feeder has to carry the supply across the open tie switch, and it cannot take the extra power. That is not a fault in the model. It is the question that comes with a new connection: does the backup path hold?`;
  return directionVerb(text, richtung, language);
}

export function deltaText(current: number, base: number, language: AppLanguage, digits: number): string {
  const delta = current - base;
  const formatted = formatQuantity(Math.abs(delta), language, digits);
  const signed = delta > 0 ? `+${formatted}` : delta < 0 ? `−${formatted}` : formatQuantity(0, language, digits);
  return language === "de" ? `Δ ${signed}` : `Δ ${signed}`;
}
