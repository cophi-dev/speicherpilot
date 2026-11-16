import { DATEN_DATEIEN } from "@/lib/seo/datenDownloads";
import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";
import { SITE_DESCRIPTION } from "@/lib/siteOg";

export function llmsTxtBody(): string {
  const origin = getPublicSiteOrigin();
  return `# SpeicherPilot

> ${SITE_DESCRIPTION}

SpeicherPilot macht Großspeicher, Überschuss und Residuallast in Deutschland mit Tages- und Monatsdaten nachvollziehbar — inkl. Modellrechnungen zu Flottenstufen und Fahrweisen.

## Hauptseiten

- ${origin}/ — Start mit Tagesüberblick und Kennzahlen
- ${origin}/tag — Archiv einzelner Tage (Restlast, Day-Ahead, Flottenmodell)
- ${origin}/monat — Monatsbilanz mit Restlastspitze je Fahrweise
- ${origin}/jahr — Jahresansicht NEP-Speicher und Restlastspitze (Netto-Wirkung übers Jahr)
- ${origin}/netzbetreiber — BESS ≥1 MW in Betrieb je Netzbetreiber (MaStR-Karte, SMARD Bundesländer)
- ${origin}/kompromiss — Kompromiss · Fahrweisen (national; Euro nur in der ×1-Modellschätzung)
- ${origin}/methodik — Formeln, Annahmen, Grenzen und Quellen
- ${origin}/daten — Daten zum Download (CSV/JSON, Lizenz CC BY 4.0, Zitiervorschlag)
- ${origin}/beitraege — Fachartikel und Einordnung

## Methodik

${origin}/methodik

## Grenzen

National aggregiert, kein (n−1), keine lokale Netzengpasskarte, keine Abregelungsmeldungen. Zahlen sind Modellschätzungen aus öffentlichen Zeitreihen, keine Beratung.

## Kontakt / Impressum

${origin}/impressum
`;
}

export function llmsFullTxtBody(): string {
  return `${llmsTxtBody()}

## Datenquellen (Auszug)

- Energy-Charts (Fraunhofer ISE)
- Bundesnetzagentur | SMARD.de
- battery-charts.de (RWTH)

Lizenzdetails je Quelle: ${getPublicSiteOrigin()}/methodik

## Daten zum Download (CC BY 4.0)

${DATEN_DATEIEN.map((datei) => `- ${getPublicSiteOrigin()}/daten/${datei.slug} — ${datei.titel}`).join("\n")}
`;
}