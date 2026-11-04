export const METHODIK_CHAPTERS = [
  {
    id: "a-modell",
    letter: "A",
    de: "A · Modell",
    en: "A · Model",
    deLead:
      "Speicher, Wirkungsgrad, SoC, Flotte ×1–×10 — nur ×1 mit Euro als Modellschätzung.",
    enLead: "Storage, efficiency, state of charge, fleet ×1–×10 — euro only at ×1 as a model estimate.",
  },
  {
    id: "b-daten",
    letter: "B",
    de: "B · Daten",
    en: "B · Data",
    deLead: "Energy-Charts, SMARD, EPEX, battery-charts, Abregelung, Aktualität und Datenquellen.",
    enLead: "Energy-Charts, SMARD, EPEX, battery-charts, curtailment, freshness and data sources.",
  },
  {
    id: "c-netz",
    letter: "C",
    de: "C · Netz und Beispiele",
    en: "C · Grid and examples",
    deLead: "Badge netzdienlich v1, Standort, Szenarien und Testnetz (n-1).",
    enLead: "Grid-support badge v1, site, scenarios and test grid (n-1).",
  },
  {
    id: "d-recht",
    letter: "D",
    de: "D · Recht und Glossar",
    en: "D · Law and glossary",
    deLead:
      "Quellen- und Lizenzliste, Glossar; Rechtsrahmen-Überblick zusätzlich in A5 und C2 mit Verweis hierher.",
    enLead:
      "Source and licence list, glossary; legal overview also in A5 and C2 with a link here.",
  },
] as const;

export const METHODIK_SECTIONS = [
  { id: "annahmen", chapter: "A", num: 1, de: "Annahmen auf einen Blick", en: "Assumptions at a glance" },
  { id: "was", chapter: "A", num: 2, de: "Was gerechnet wird", en: "What is calculated" },
  { id: "grossspeicher", chapter: "A", num: 3, de: "Großspeicher-Modell", en: "Large-storage model" },
  { id: "live", chapter: "A", num: 4, de: "Überschuss und Grenzhandel", en: "Surplus and border trade" },
  { id: "uebersicht", chapter: "A", num: 5, de: "Zeitraum-Übersicht", en: "Period overview" },
  { id: "groesse", chapter: "A", num: 6, de: "Speichergröße", en: "Storage size" },
  { id: "auffaelligkeit", chapter: "A", num: 7, de: "Auffälligkeit des Tages", en: "Daily highlight rule" },
  { id: "lizenzen", chapter: "B", num: 1, de: "Datenquellen", en: "Data sources" },
  { id: "grenzen", chapter: "B", num: 2, de: "Grenzen des Modells", en: "Limits of the model" },
  { id: "einheiten", chapter: "B", num: 3, de: "Daten und Einheiten", en: "Data and units" },
  { id: "ampel", chapter: "C", num: 1, de: "Anschluss-Ampel", en: "Connection light" },
  { id: "netzdienlichkeit", chapter: "C", num: 2, de: "Einschätzung netzdienlich", en: "Grid-support estimate" },
  { id: "peak-erklaert", chapter: "C", num: 3, de: "Peak Shaving", en: "Peak shaving" },
  { id: "modelltag", chapter: "C", num: 4, de: "Modelltag Großspeicher", en: "Large-storage model day" },
  { id: "beispieltage", chapter: "C", num: 5, de: "Beispieltage", en: "Example days" },
  { id: "szenarien", chapter: "C", num: 6, de: "Szenarien", en: "Scenarios" },
  { id: "netz", chapter: "C", num: 7, de: "Netzwirkung im Testnetz", en: "Grid effect in a test grid" },
  { id: "ort-archetypen", chapter: "C", num: 8, de: "Ort-Archetypen SimBench", en: "Site archetypes SimBench" },
  { id: "fahrweisen", chapter: "C", num: 9, de: "Fahrweisen am Ort", en: "Site operation modes" },
  { id: "fest-flexibel", chapter: "C", num: 10, de: "Fest und flexibel bis X/Y", en: "Firm and flexible up to X/Y" },
  { id: "netzdienlich-v2", chapter: "C", num: 11, de: "Badge netzdienlich v2", en: "Grid-support badge v2" },
  { id: "konfliktviertelstunden", chapter: "C", num: 12, de: "Konfliktviertelstunden", en: "Conflict quarter-hours" },
  { id: "vergabe", chapter: "C", num: 13, de: "Vergabe (generisch)", en: "Allocation (generic)" },
  { id: "ladepark", chapter: "C", num: 14, de: "Ladepark-Beispiel", en: "Charging-hub example" },
  { id: "netzentgelt-benutzungsdauer", chapter: "C", num: 15, de: "Netzentgelt Benutzungsdauer", en: "Grid fees by utilisation" },
  { id: "quellen", chapter: "D", num: 1, de: "Quellen und Lizenzen", en: "Sources and licences" },
  { id: "glossar", chapter: "D", num: 2, de: "Glossar", en: "Glossary" },
] as const;

export type MethodikSectionId = (typeof METHODIK_SECTIONS)[number]["id"];

export function methodikSectionLabel(id: MethodikSectionId, language: "de" | "en"): string {
  const section = METHODIK_SECTIONS.find((item) => item.id === id);
  if (!section) {
    return id;
  }
  const title = language === "de" ? section.de : section.en;
  return `${section.chapter}${section.num} ${title}`;
}

export function methodikSectionNavLabel(id: MethodikSectionId, language: "de" | "en"): string {
  return methodikSectionLabel(id, language);
}
