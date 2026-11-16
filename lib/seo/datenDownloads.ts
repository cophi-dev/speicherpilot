import datenJahr from "@/data/forschung/daten_jahr_v1.json";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Lizenz der SpeicherPilot-Datensätze auf /daten. */
export const DATEN_LIZENZ = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/deed.de",
  schemaUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;

export const DATEN_STAND = datenJahr.stand;
export const DATEN_ZEITRAUM = datenJahr.zeitraum;

/** Temporal coverage ISO 8601 interval for the Jahresdatensatz. */
export const DATEN_TEMPORAL_COVERAGE = "2025-11-16/2026-11-15";

export const DATEN_QUELLENZEILE =
  "Datenbasis: Energy-Charts (Fraunhofer ISE), Bundesnetzagentur | SMARD.de (CC BY 4.0), battery-charts.de (RWTH, CC BY 4.0).";

export function zitiervorschlag(origin: string): string {
  return `Zarindast, Phillipp (2026): SpeicherPilot – Großspeicher und Restlastspitze in Deutschland, Jahresdatensatz 16.11.2025–15.11.2026 (Stand ${DATEN_STAND}). ${origin}/daten. Lizenz: CC BY 4.0. ${DATEN_QUELLENZEILE}`;
}

export type DatenDatei = {
  slug: string;
  titel: string;
  beschreibung: string;
  format: "CSV" | "JSON";
  mime: string;
  build: (origin: string) => string;
};

type Stufe = (typeof datenJahr.stufen)[number];

function num(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "";
  }
  return Number(value.toFixed(digits)).toString();
}

function csvKopf(origin: string, zeilen: string[]): string {
  return [
    `# SpeicherPilot – ${origin}/daten – Lizenz CC BY 4.0 (${DATEN_LIZENZ.url})`,
    `# Zitiervorschlag: ${zitiervorschlag(origin)}`,
    ...zeilen.map((zeile) => `# ${zeile}`),
  ].join("\n");
}

/** Month labels for the 13 segments (first and last month are partial). */
export function segmentLabels(): string[] {
  return datenJahr.basis.segmente.map(([start]) => start.slice(0, 7));
}

export function buildStufenCsv(origin: string): string {
  const monate = segmentLabels();
  const header = [
    "stufe",
    "dauer_h",
    "leistung_gesamt_gw",
    "energie_gesamt_gwh",
    "spitze_vorher_gw",
    "senkung_jahr_gw",
    "spitze_nachher_gw",
    "tage_an_kappe",
    ...monate.map((monat) => `senkung_${monat}_gw`),
  ];
  const vorher = datenJahr.basis.spitze_GW;
  const rows = datenJahr.stufen.map((s: Stufe) =>
    [
      s.stufe,
      num(s.dauer_h, 2),
      num(s.P_ges_GW),
      num(s.E_ges_GWh),
      num(vorher),
      num(s.senkung_GW),
      num(s.spitze_nach_GW),
      String(s.tage_kappe),
      ...s.monat_senkung_GW.map((wert) => num(wert)),
    ].join(","),
  );
  return [
    csvKopf(origin, [
      `Zeitraum ${DATEN_ZEITRAUM}, 35 040 Viertelstunden, national (Deutschland).`,
      "Restlast = Last minus Wind minus Solar. Fahrweise: minimale Jahresspitze der Restlast mit Vollvoraussicht (Obergrenze der Wirkung).",
      "Stufe = Gesamtflotte (x2/x5/x10 = Vielfaches des Bestands 4,70 GW / 8,27 GWh; NEP A/B/C = 41,1/67,6/94,1 GW). Wirkungsgrad 85 %, SoC 10–90 %.",
      "Erster und letzter Monat sind Teilmonate (16.–30.11.2025, 01.–15.11.2026). Modellrechnung, kein (n-1), keine Beratung.",
    ]),
    header.join(","),
    ...rows,
    "",
  ].join("\n");
}

export function buildTagesspitzenCsv(origin: string): string {
  const rows = datenJahr.tagesspitzen.map((t) => `${t.tag},${num(t.spitze_GW)}`);
  return [
    csvKopf(origin, [
      `Tageshöchstwert der Restlast (Last minus Wind minus Solar) in Deutschland ohne zusätzliche Speicher, ${DATEN_ZEITRAUM}.`,
      "Viertelstundenwerte aus Energy-Charts, Tag nach Europe/Berlin.",
    ]),
    "tag,restlast_spitze_gw",
    ...rows,
    "",
  ].join("\n");
}

export function buildOktoberFahrweisenCsv(origin: string): string {
  const raw = readFileSync(
    path.join(process.cwd(), "data/national-fleet/2026-10/design-daten-r9.csv"),
    "utf8",
  ).trim();
  return [
    csvKopf(origin, [
      "Oktober 2026, national: Restlastspitze vorher/nachher je Fahrweise und Flottenstufe (factor = Gesamtflotte als Vielfaches des Bestands, 1 = 4,58 GW / 8 GWh).",
      "strategy: min_peak_perfect_foresight = spitzenorientiert mit Vollvoraussicht; price_oriented_da_arbitrage = nach Day-Ahead-Preis; surplus_wind_solar_over_load = lädt nur Überschuss.",
      "Modellrechnung. Positive reduction_gw = Spitze sinkt; negative Werte = Spitze steigt durch Laden (neue Last).",
    ]),
    raw,
    "",
  ].join("\n");
}

export function buildJahrJson(origin: string): string {
  return `${JSON.stringify(
    {
      titel: "SpeicherPilot – Großspeicher und Restlastspitze in Deutschland, Jahresdatensatz",
      quelle_url: `${origin}/daten`,
      lizenz: DATEN_LIZENZ.name,
      lizenz_url: DATEN_LIZENZ.schemaUrl,
      zitiervorschlag: zitiervorschlag(origin),
      hinweis:
        "Modellrechnung, national aggregiert, kein (n-1), keine Abregelung. Spitzenorientierte Fahrweise mit Vollvoraussicht = Obergrenze.",
      daten: datenJahr,
    },
    null,
    2,
  )}\n`;
}

export const DATEN_DATEIEN: DatenDatei[] = [
  {
    slug: "speicherpilot-jahr-stufen.csv",
    titel: "Jahreswirkung je Flottenstufe",
    beschreibung:
      "Senkung der nationalen Restlastspitze je Flottenstufe (x2, x5, x10, NEP A/B/C) bei 1,76 h und 4 h Speicherdauer, Jahr und je Monat.",
    format: "CSV",
    mime: "text/csv; charset=utf-8",
    build: buildStufenCsv,
  },
  {
    slug: "speicherpilot-jahr-tagesspitzen.csv",
    titel: "Restlastspitze je Tag",
    beschreibung: "365 Tageshöchstwerte der Restlast in Deutschland ohne zusätzliche Speicher.",
    format: "CSV",
    mime: "text/csv; charset=utf-8",
    build: buildTagesspitzenCsv,
  },
  {
    slug: "speicherpilot-oktober-2026-fahrweisen.csv",
    titel: "Oktober 2026 je Fahrweise",
    beschreibung:
      "Restlastspitze vorher/nachher, Lade- und Entlademengen je Fahrweise (spitzenorientiert, nach Preis, nur Überschuss) und Flottenstufe.",
    format: "CSV",
    mime: "text/csv; charset=utf-8",
    build: buildOktoberFahrweisenCsv,
  },
  {
    slug: "speicherpilot-jahr-komplett.json",
    titel: "Jahresdatensatz komplett",
    beschreibung:
      "Alle Kennzahlen der Jahresansicht /vision: Basis, Stufen, Preis-Szenarien als Spitzenwerte, Überschuss, Kappungstage, Vorjahresvergleich.",
    format: "JSON",
    mime: "application/json; charset=utf-8",
    build: buildJahrJson,
  },
];

export function findDatenDatei(slug: string): DatenDatei | undefined {
  return DATEN_DATEIEN.find((datei) => datei.slug === slug);
}

/** Kernzahlen für den Faktensatz auf /daten. */
export function datenKernzahlen() {
  const nepA = datenJahr.stufen.find((s) => s.stufe === "NEP A" && s.dauer_h === 2);
  const nepC = datenJahr.stufen.find((s) => s.stufe === "NEP C" && s.dauer_h === 2);
  return {
    spitzeVorherGw: datenJahr.basis.spitze_GW,
    spitzeTag: datenJahr.basis.spitze_tag,
    spitzeUhr: datenJahr.basis.spitze_uhr,
    nepASenkungGw: nepA?.senkung_GW ?? null,
    nepCSenkungGw: nepC?.senkung_GW ?? null,
  };
}
