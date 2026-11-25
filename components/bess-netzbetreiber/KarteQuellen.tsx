/**
 * Quellenvermerke der 3D-Karte im Wortlaut der speicherpilot-Fachprüfung 25.11 13:06
 * (BKG-Nutzungsbedingungen VG2500, dl-de/by-2-0 Abs. 3; BT-Drs. 21/5933).
 */
const BKG_DATENQUELLEN = "https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg_nuts.pdf";
const BMWE_PDF = "https://dserver.bundestag.de/btd/21/059/2105933.pdf";

/** URL als Text, der nur an „/“ umbrechen darf (kein Umbruch mitten im Wort). */
function UrlText({ url }: { url: string }) {
  const teile = url.split("/");
  return (
    <>
      {teile.map((t, i) => (
        <span key={i}>
          {t}
          {i < teile.length - 1 ? (
            <>
              /<wbr />
            </>
          ) : null}
        </span>
      ))}
    </>
  );
}

/**
 * Kurze BKG-Zeile an der Karte (speicherpilot 25.11 14:42, Pflicht): Bereitsteller, Lizenz mit Link,
 * Datensatz-URI und Änderungshinweis (dl-de/by-2-0 §2, §3), ohne Roh-URL. Volltext im Quellenblock.
 */
export function BkgKurz({ className }: { className?: string }) {
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
      ,{" "}
      <a href={BKG_DATENQUELLEN} rel="noopener">
        Datenquellen
      </a>
      , Daten geändert (generalisiert, WGS84)
    </p>
  );
}

/** Kurzer Verweis in der Legende auf die BMWE-Quelle im Quellenblock. */
export function BmweKurz({ className, quellenId }: { className?: string; quellenId: string }) {
  return (
    <p className={className}>
      Quelle: BMWE, BT-Drucksache 21/5933, S.{"\u00a0"}43–44 ·{" "}
      <a href={`#${quellenId}`}>Quellenangabe</a>
    </p>
  );
}

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
        geodatenzentrum.de{"\u00a0"}(PDF)
      </a>
      ; Daten geändert (generalisiert, WGS84).
    </p>
  );
}

export function BmweQuelle({ className, flaeche = true }: { className?: string; flaeche?: boolean }) {
  return (
    <p className={className}>
      Quelle: Antwort der Bundesregierung (BMWE, StS Frank Wetzel) vom 12.05.2026 auf Schriftliche Frage 70,
      BT-Drucksache 21/5933, S. 43–44,{" "}
      <a href={BMWE_PDF} rel="noopener">
        <UrlText url={BMWE_PDF} />
      </a>
      ; amtliches Werk (§{"\u00a0"}5 Abs.{"\u00a0"}2 UrhG), Werte unverändert übernommen, eigene Darstellung.
      {flaeche ? " Fläche: eigene Berechnung (Gesamt minus Wind Offshore)." : null}
    </p>
  );
}
