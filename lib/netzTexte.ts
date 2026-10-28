import type { AppLanguage } from "@/components/language-context";
import { formatQuantity } from "@/lib/formatQuantity";
import {
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

export function deltaText(current: number, base: number, language: AppLanguage, digits: number): string {
  const delta = current - base;
  const formatted = formatQuantity(Math.abs(delta), language, digits);
  const signed = delta > 0 ? `+${formatted}` : delta < 0 ? `−${formatted}` : formatQuantity(0, language, digits);
  return language === "de" ? `Δ ${signed}` : `Δ ${signed}`;
}
