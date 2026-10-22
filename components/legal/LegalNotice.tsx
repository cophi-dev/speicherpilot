"use client";

import { useLanguage } from "@/components/language-context";

const MAIL = "pzarindast@gmail.com";

export function LegalNotice() {
  const { language } = useLanguage();
  return (
    <article className="legal-doc">
      <div className="legal-doc-inner">
        {language === "en" ? (
          <p className="legal-en">The binding text of this page is the German legal notice below.</p>
        ) : null}
        <h1>Impressum</h1>
        <p>Angaben gemäß § 5 DDG und § 18 Abs. 1 MStV</p>
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
        <p>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV: Phillipp Zarindast, Anschrift wie oben.</p>
        <p>SpeicherPilot ist ein privates, nicht kommerzielles Projekt. Die Rechenwerte sind Modellschätzungen, keine Beratung.</p>
      </div>
    </article>
  );
}
