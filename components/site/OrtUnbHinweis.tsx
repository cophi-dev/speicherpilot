import Link from "next/link";

export function OrtUnbHinweis() {
  return (
    <aside className="v4-content v4-ort-unb-hinweis" aria-labelledby="ort-unb-title" data-testid="ort-unb-hinweis">
      <h2 id="ort-unb-title" className="v4-chapter-h2 v4-ort-unb-title">
        Freie Anschlusskapazität (Art.&nbsp;50 Abs.&nbsp;4a VO&nbsp;2019/943)
      </h2>
      <p className="v4-subline">
        ÜNB veröffentlichen danach mindestens monatlich verfügbare Kapazität in MW-Klassen — nicht bis zur
        Mittelspannung. SpeicherPilot baut keine Deutschlandkarte und erfindet keine Punktwerte.
      </p>
      <ul className="v4-ort-unb-links num">
        <li>
          <a
            href="https://www.transnetbw.de/de/transparenz/netzzugang-und-entgelt/netzanschlusskarte"
            className="v4-text-link"
            rel="noopener noreferrer"
          >
            TransnetBW Netzanschlusskarte
          </a>
          <span className="v4-footnote"> (Stand 05/2026, 380-kV-Umspannwerke)</span>
        </li>
        <li>
          <a
            href="https://www.50hertz.com/de/Vertragspartner/Netzkunden/Netzanschluss"
            className="v4-text-link"
            rel="noopener noreferrer"
          >
            50Hertz Netzanschluss
          </a>
          <span className="v4-footnote"> (Regelzone mit Hamburg, Stand 31.03.2026)</span>
        </li>
      </ul>
      <p className="v4-footnote v4-ort-unb-foot">
        Einheitliche maschinenlesbare Reihe bis Mittelspannung: nicht belegt.{" "}
        <Link href="/methodik#netzkapazitaet-unb" className="v4-footnote-link">
          Einordnung in der Methodik
        </Link>
      </p>
    </aside>
  );
}
