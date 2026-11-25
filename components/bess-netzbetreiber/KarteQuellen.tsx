/**
 * Quellenvermerke der 3D-Karte im Wortlaut der speicherpilot-Fachprüfung 25.11 13:06
 * (BKG-Nutzungsbedingungen VG2500, dl-de/by-2-0 Abs. 3; BT-Drs. 21/5933).
 */
const BKG_DATENQUELLEN = "https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf";
const BMWE_PDF = "https://dserver.bundestag.de/btd/21/059/2105933.pdf";

export function BkgAttribution({ className }: { className?: string }) {
  return (
    <p className={className}>
      Ländergrenzen: ©{"\u00a0"}
      <a href="https://www.bkg.bund.de" rel="noopener">
        BKG
      </a>{" "}
      (2026){" "}
      <a href="https://www.govdata.de/dl-de/by-2-0" rel="noopener">
        dl-de/by-2-0
      </a>
      , Datenquellen:{" "}
      <a href={BKG_DATENQUELLEN} rel="noopener">
        {BKG_DATENQUELLEN}
      </a>
      ; Daten geändert (generalisiert, WGS84).
    </p>
  );
}

export function BmweQuelle({ className }: { className?: string }) {
  return (
    <p className={className}>
      Quelle: Antwort der Bundesregierung (BMWE, StS Frank Wetzel) vom 12.05.2026 auf Schriftliche Frage 70,
      BT-Drucksache 21/5933, S. 43–44,{" "}
      <a href={BMWE_PDF} rel="noopener">
        {BMWE_PDF}
      </a>
      ; amtliches Werk (§{"\u00a0"}5 Abs.{"\u00a0"}2 UrhG), Werte unverändert übernommen, eigene Darstellung.
    </p>
  );
}
