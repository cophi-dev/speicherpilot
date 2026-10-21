import type { ConnectionStatus, GridSupportStatus } from "@/lib/sitePlanner";

import { ratePayback, type TrafficLight } from "@/lib/readability";

type Language = "de" | "en";

export function storageSentence(energyKwh: number, powerKw: number, language: Language): string {
  const energy = Math.round(energyKwh);
  const power = Math.round(powerKw);
  return language === "de"
    ? `${energy} kWh Speicherinhalt · ${power} kW Leistung.`
    : `${energy} kWh of storage · ${power} kW of power.`;
}

export function peakSentence(beforeKw: number, afterKw: number, language: Language): string {
  const before = Math.round(beforeKw);
  const after = Math.round(afterKw);
  return language === "de"
    ? `Ohne Speicher ${before} kW, mit Speicher ${after} kW.`
    : `Without storage ${before} kW, with storage ${after} kW.`;
}

export function connectionSentence(status: ConnectionStatus, overKw: number, language: Language): string {
  if (status === "over") {
    const over = Math.max(0, Math.round(overKw));
    return language === "de"
      ? `Spitze liegt trotz Speicher noch ${over} kW über der Anschlussgrenze.`
      : `Even with storage, the peak is still ${over} kW above the connection limit.`;
  }
  if (status === "near") {
    return language === "de"
      ? "Die Spitze liegt mit Speicher auf der Anschlussgrenze. Ein größerer Anschluss ist dafür nicht nötig."
      : "With storage, the peak sits on the connection limit. A larger connection is not needed for this peak.";
  }
  return language === "de"
    ? "Die Spitze bleibt unter der Anschlussgrenze, mit Reserve."
    : "The peak stays under the connection limit, with room to spare.";
}

export function paybackSentence(years: number | null, language: Language): string {
  const band = ratePayback(years);
  if (years == null || !Number.isFinite(years)) {
    return language === "de"
      ? "Innerhalb der angenommenen Lebensdauer kommt das Geld nicht zurück."
      : "The money does not come back inside the assumed lifetime.";
  }
  const shown = years.toFixed(1).replace(".", ",");
  const shownEn = years.toFixed(1);
  if (language === "de") {
    const pace = band === "green" ? "Das lesen wir als schnell" : band === "yellow" ? "Das lesen wir als knapp" : "Das lesen wir als langsam";
    return `Die Ausgabe ist in ${shown} Jahren wieder drin. ${pace}.`;
  }
  const pace = band === "green" ? "We read that as quick" : band === "yellow" ? "We read that as tight" : "We read that as slow";
  return `The outlay is back in ${shownEn} years. ${pace}.`;
}

export function supportSentence(status: GridSupportStatus, language: Language): string {
  if (status === "new-peak") {
    return language === "de"
      ? "Beim Laden entsteht eine neue, höhere Bezugsspitze. Das ist eine Schätzung, kein Befund des Netzbetreibers."
      : "Charging creates a new, higher import peak. This is an estimate, not a grid-operator finding.";
  }
  if (status === "supportive") {
    return language === "de"
      ? "Der Speicher gibt Strom vor allem dann ab, wenn der Anschluss schon stark belastet ist. Schätzung, kein Befund des Netzbetreibers."
      : "The battery delivers power mostly when the connection is already heavily loaded. An estimate, not a grid-operator finding.";
  }
  if (status === "mixed") {
    return language === "de"
      ? "Ein Teil der Entladung fällt in die starken Stunden, ein Teil daneben. Schätzung, kein Befund des Netzbetreibers."
      : "Some of the discharge falls in the heavy hours, some of it outside them. An estimate, not a grid-operator finding.";
  }
  return language === "de"
    ? "Der Speicher entlädt überwiegend außerhalb der starken Stunden. Schätzung, kein Befund des Netzbetreibers."
    : "The battery mostly discharges outside the heavy hours. An estimate, not a grid-operator finding.";
}

export function ratingWord(light: TrafficLight, language: Language): string {
  if (light === "green") {
    return language === "de" ? "Passt" : "Fits";
  }
  if (light === "yellow") {
    return language === "de" ? "Knapp" : "Tight";
  }
  return language === "de" ? "Kritisch" : "Critical";
}
