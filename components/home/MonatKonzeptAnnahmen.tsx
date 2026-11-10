import styles from "@/components/home/monat-konzept.module.css";

export function MonatKonzeptAnnahmen({ fleetFootnote }: { fleetFootnote: string }) {
  return (
    <details className={styles.konzeptAnnahmen} data-testid="konzept-annahmen">
      <summary>Annahmen</summary>
      <dl className={styles.konzeptAnnahmenDl}>
        <div>
          <dt>Modellflotte</dt>
          <dd className="num">{fleetFootnote}</dd>
        </div>
        <div>
          <dt>Lauf (Arbeit gegen Wirkung)</dt>
          <dd>
            Spitze sinkt um die Differenz Referenzspitze ohne Speicher minus höchste Restlast mit Speicher. Round-Trip
            85&nbsp;%, SoC 10–90&nbsp;%, Day-Ahead Price Taker, perfekte Voraussicht — ohne Preisrückwirkung bei ×5/×10.
          </dd>
        </div>
        <div>
          <dt>Dauerlinie</dt>
          <dd>
            Weiß: beobachtete Restlast (Last − Wind − Sonne). Farbig: gewählter Lauf nach Restlast sortiert (2.980
            Viertelstunden = 745&nbsp;h). 60-GW-Linie als visuelle Hilfe.
          </dd>
        </div>
        <div>
          <dt>Quelle</dt>
          <dd>
            Energy-Charts / SMARD CC BY 4.0.{" "}
            <a href="/methodik#monat-konzept-ac" className="v4-footnote-link">
              Methodik
            </a>
          </dd>
        </div>
      </dl>
    </details>
  );
}
