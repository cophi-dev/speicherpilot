export function MethodikNetzKapazitaet() {
  return (
    <section className="v4-chapter" id="netzkapazitaet-unb" aria-labelledby="netzkapazitaet-unb-h">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Netz</p>
        <h2 id="netzkapazitaet-unb-h" className="v4-chapter-h2">
          Öffentliche Anschlusskapazität (ÜNB)
        </h2>
      </div>
      <ul className="v4-content methodik-insights-footnotes methodik-unb-list">
        <li>
          Rechtsgrundlage: Art. 50 Abs. 4a der VO (EU) 2019/943 in der Fassung der VO (EU) 2024/1747 — Übertragungsnetzbetreiber
          veröffentlichen mindestens monatlich die für neue Anschlüsse verfügbare Kapazität in hoher räumlicher Auflösung.
        </li>
        <li>
          Datenbasis: MW-Klassen je Umspannwerk auf den ÜNB-Seiten (z. B. TransnetBW Stand 05/2026, 50Hertz Stand 31.03.2026).
        </li>
        <li>
          Grenzfall: Keine einheitliche maschinenlesbare Reihe bis zur Mittelspannung; SpeicherPilot zeigt keine eigene Karte.
        </li>
      </ul>
    </section>
  );
}
