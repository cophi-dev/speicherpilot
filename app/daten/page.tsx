import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import {
  DATEN_DATEIEN,
  DATEN_LIZENZ,
  DATEN_QUELLENZEILE,
  DATEN_STAND,
  DATEN_TEMPORAL_COVERAGE,
  datenKernzahlen,
  zitiervorschlag,
} from "@/lib/seo/datenDownloads";
import { datasetJsonLd } from "@/lib/seo/jsonLd";
import { socialMeta } from "@/lib/siteOg";

import styles from "./daten.module.css";

const title = "Daten zum Download: Großspeicher und Restlastspitze (CC BY 4.0)";
const description =
  "Jahresdatensatz 16.11.2025–15.11.2026: wie stark Großspeicher-Flotten die Restlastspitze in Deutschland senken, je Stufe, Monat und Fahrweise. CSV und JSON, Lizenz CC BY 4.0.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/daten" },
  ...socialMeta({ title, description, url: "/daten" }),
};

function gw(value: number | null): string {
  if (value === null) {
    return "–";
  }
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function tagLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-");
  return `${d}.${m}.${y}`;
}

export default function DatenPage() {
  const origin = getPublicSiteOrigin();
  const kern = datenKernzahlen();
  const dataset = datasetJsonLd({
    path: "/daten",
    name: "SpeicherPilot – Großspeicher und Restlastspitze in Deutschland (Jahresdatensatz)",
    description,
    temporalCoverage: DATEN_TEMPORAL_COVERAGE,
    includeNep: true,
    license: DATEN_LIZENZ.schemaUrl,
    keywords: [
      "Großbatteriespeicher",
      "Restlast",
      "Residuallast",
      "Restlastspitze",
      "Netzentwicklungsplan",
      "Deutschland",
    ],
    distribution: DATEN_DATEIEN.map((datei) => ({
      name: datei.titel,
      contentUrl: `/daten/${datei.slug}`,
      encodingFormat: datei.format === "CSV" ? "text/csv" : "application/json",
    })),
  });

  return (
    <article className="legal-doc v4-subpage">
      <JsonLd data={{ "@context": "https://schema.org", ...dataset }} />
      <div className="legal-doc-inner prose">
        <h1>Daten zum Download</h1>
        <p>
          Hier liegen die Zahlen hinter der <Link href="/vision">Jahresansicht</Link> und der{" "}
          <Link href="/monat">Monatsbilanz</Link> als CSV und JSON. Stand: {DATEN_STAND}.
        </p>
        <p>
          Kernaussage: Die höchste Restlast in Deutschland lag im Zeitraum 16.11.2025–15.11.2026 bei{" "}
          {gw(kern.spitzeVorherGw)} GW ({tagLabel(kern.spitzeTag)}, {kern.spitzeUhr} Uhr). Eine
          Speicherflotte in der Größe von NEP-Szenario A (41,1 GW, 2 h) hätte diese Jahresspitze im
          Modell um {gw(kern.nepASenkungGw)} GW gesenkt, Szenario C (94,1 GW, 2 h) um{" "}
          {gw(kern.nepCSenkungGw)} GW. Das gilt für eine spitzenorientierte Fahrweise mit voller
          Voraussicht und ist damit eine Obergrenze.
        </p>

        <h2>Dateien</h2>
        <ul className={styles.liste}>
          {DATEN_DATEIEN.map((datei) => (
            <li key={datei.slug} className={styles.eintrag}>
              <p className={styles.eintragTitel}>
                <a href={`/daten/${datei.slug}`} download={datei.slug}>
                  {datei.titel}
                </a>
                <span className={styles.format}>{datei.format}</span>
              </p>
              <p>{datei.beschreibung}</p>
            </li>
          ))}
        </ul>
        <p>
          CSV: Komma als Trennzeichen, Punkt als Dezimalzeichen, UTF-8. Zeilen mit # am Anfang sind
          Kopfhinweise (Lizenz, Zeitraum, Annahmen).
        </p>

        <h2>Lizenz</h2>
        <p>
          Die Modellrechnung und die hier angebotenen Aufbereitungsdateien stehen unter{" "}
          <a href={DATEN_LIZENZ.url} rel="license">
            Creative Commons Namensnennung 4.0 International (CC BY 4.0)
          </a>
          . Sie dürfen sie kopieren, verändern und auch kommerziell nutzen, wenn Sie SpeicherPilot als
          Quelle nennen und auf diese Seite verlinken. Die zugrunde liegenden Reihen von Energy-Charts
          (Fraunhofer ISE), der Bundesnetzagentur (SMARD.de) und battery-charts (RWTH) bleiben unter
          ihrer jeweiligen Lizenz; die Pflicht zur Namensnennung dieser Quellen gilt weiter.
        </p>
        <p>{DATEN_QUELLENZEILE}</p>

        <h2>Zitiervorschlag</h2>
        <p className={styles.zitat}>{zitiervorschlag(origin)}</p>

        <h2>Was die Zahlen sind und was nicht</h2>
        <ul className={styles.punkte}>
          <li>Restlast = Stromverbrauch minus Wind- und Solareinspeisung, national, je Viertelstunde.</li>
          <li>
            Speicher sind gerechnet, nicht gemessen: Wirkungsgrad 85 %, Ladestand 10–90 %, Start und
            Ende bei 50 %.
          </li>
          <li>
            Die Monatssenkung in der Stufen-Datei ist die Senkung der jeweiligen Monatsspitze, nicht
            ein Anteil an der Jahressenkung. Die Summe der Monate ist nicht die Jahressenkung.
          </li>
          <li>
            Der Jahresdatensatz rechnet mit 4,70&nbsp;GW / 8,27&nbsp;GWh (battery-charts, 16.11.2026).
            Die Oktober-Datei nutzt eine ältere Modellreferenz von 4,58&nbsp;GW / 8&nbsp;GWh. Die
            beiden Stände nicht mischen.
          </li>
          <li>
            Der Jahresdatensatz (Stand 16.11.2026) ist vor der Regel „bei gleicher Spitze so flach
            wie möglich laden“ gerechnet. Die Senkung der Jahresspitze ändert sich dadurch
            typischerweise nicht, die Tagesform der Last schon.
          </li>
          <li>
            Laden ist neue Last. Fährt eine große Flotte nach Day-Ahead-Preis, kann sie die
            bundesweite Restlast-Spitze erhöhen statt senken; das zeigt die Oktober-Datei.
          </li>
          <li>Kein (n−1), keine lokalen Netzengpässe, keine Abregelung. Keine Beratung.</li>
        </ul>
        <p>
          Formeln, Annahmen und Quellen stehen in der <Link href="/methodik">Methodik</Link>.
          Fragen zu den Daten: <Link href="/impressum">Kontakt im Impressum</Link>.
        </p>
      </div>
    </article>
  );
}
