export function MethodikMonatKonzept() {
  return (
    <section className="v4-content methodik-section" id="monat-konzept-ac" aria-labelledby="methodik-monat-ac-title">
      <h2 id="methodik-monat-ac-title" className="v4-chapter-h2">
        Monatsseite: Arbeit gegen Wirkung und Dauerlinie
      </h2>
      <ul className="methodik-insights-footnotes">
        <li>
          <strong>Konzept A:</strong> Wirkung auf die Monats-Restlastspitze = Referenzspitze minus Spitze mit Speicher
          (GW, positiv = Senkung). Netz-Ladung = Summe der viertelstündlichen Ladeleistung (GWh). Logarithmische
          x-Achse nur Darstellung.
        </li>
        <li>
          <strong>Konzept C:</strong> Restlast (Last − Wind − Sonne) je Viertelstunde, chronologisch oder nach Höhe
          sortiert (Dauerlinie). Übergang per Scroll; bei <code>prefers-reduced-motion</code> nur sortiert.
        </li>
        <li>
          Annahmen: Round-Trip 85&nbsp;%, SoC 10–90&nbsp;%, Price Taker, nur Day-Ahead, perfekte Voraussicht, ohne
          Preisrückwirkung bei ×5/×10.
        </li>
        <li>
          Quelle: Energy-Charts / Bundesnetzagentur | SMARD.de, CC BY 4.0. Oktober-Läufe: Run9-Bundle im Repo.
        </li>
        <li>
          <strong>Tie-Break Optimierer:</strong> Bei mehreren optimalen Lösungen wählt der Solver die kleinste
          Zielfunktionsabweichung bei gleicher Primärzielfunktion; indifferente SoC-Phasen werden in der Methodik der
          Monatsoptimierung dokumentiert (vgl. Paket-4-Audit).
        </li>
      </ul>
    </section>
  );
}
