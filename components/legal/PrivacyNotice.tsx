"use client";

import { useLanguage } from "@/components/language-context";

const MAIL = "pzarindast@gmail.com";

export function PrivacyNotice() {
  const { language } = useLanguage();
  return (
    <article className="legal-doc">
      <div className="legal-doc-inner">
        {language === "en" ? (
          <p className="legal-en">The binding text of this page is the German privacy notice below.</p>
        ) : null}
        <h1>Datenschutz</h1>
        <p>Kurze Information nach Art. 13 DSGVO.</p>

        <section aria-labelledby="privacy-controller">
          <h2 id="privacy-controller">1 Verantwortlicher</h2>
          <address>
            Phillipp Zarindast
            <br />
            Brödermannsweg 77a
            <br />
            22453 Hamburg
          </address>
          <p>
            E-Mail:{" "}
            <a href={`mailto:${MAIL}`}>{MAIL}</a>
          </p>
        </section>

        <section aria-labelledby="privacy-hosting">
          <h2 id="privacy-hosting">2 Hosting</h2>
          <p>
            Die Seite liegt bei Vercel Inc. (USA). Beim Aufruf verarbeitet Vercel technisch notwendige Daten in Server-Logs: IP-Adresse, Zeitpunkt, aufgerufene Seite und Browser-Angaben. Das geschieht, um die Seite auszuliefern und abzusichern.
          </p>
          <p>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse ist die sichere, funktionierende Auslieferung. Empfänger: Vercel Inc. als Hosting-Anbieter.
          </p>
          <p>
            Diese Website wird bei <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Inc.</a>, 440 N Barranca Avenue #4133, Covina, CA 91723, USA, gehostet. Dabei werden Daten wie Ihre IP-Adresse auch in die USA übermittelt und dort verarbeitet. Vercel ist nach dem EU-U.S. Data Privacy Framework zertifiziert (Angemessenheitsbeschluss der EU-Kommission, Art. 45 DSGVO; Eintrag auf <a href="https://www.dataprivacyframework.gov/participant/6847" target="_blank" rel="noopener noreferrer">dataprivacyframework.gov</a>, Stand 22.10.2026: aktiv).
          </p>
          <p>
            Die von Vercel erzeugten{" "}
            <a href="https://vercel.com/docs/runtime-logs" target="_blank" rel="noopener noreferrer">
              Laufzeit-Protokolle
            </a>{" "}
            sind in diesem Tarif nach Angaben von Vercel eine Stunde lang abrufbar. Darüber hinaus speichert Vercel Daten nach eigener Angabe nur so lange, wie es für gesetzliche und vertragliche Pflichten oder berechtigte Geschäftszwecke nötig ist, und löscht oder anonymisiert sie danach; eine feste Frist nennt Vercel nicht.
          </p>
        </section>

        <section aria-labelledby="privacy-none">
          <h2 id="privacy-none">3 Keine Cookies</h2>
          <p>Es gibt keine Cookies, kein Tracking, keine Kontaktformulare und keine Konten.</p>
        </section>

        <section aria-labelledby="privacy-links">
          <h2 id="privacy-links">4 Externe Links</h2>
          <p>News und Quellen führen auf andere Seiten. Beim Klick gilt die Datenschutzerklärung der Zielseite.</p>
        </section>

        <section aria-labelledby="privacy-rights">
          <h2 id="privacy-rights">5 Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21).
          </p>
          <p>
            Sie können sich bei einer Aufsichtsbehörde beschweren, zum Beispiel bei Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit:{" "}
            <a href="https://datenschutz-hamburg.de" target="_blank" rel="noopener noreferrer">
              datenschutz-hamburg.de
            </a>
          </p>
        </section>

        <section aria-labelledby="privacy-stand">
          <h2 id="privacy-stand">6 Stand</h2>
          <p>Oktober 2026.</p>
        </section>
      </div>
    </article>
  );
}
