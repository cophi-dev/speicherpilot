const RULES = [
  {
    id: "insight-trockenstrecke",
    title: "Trockenstrecke",
    body: "Regel: Überschuss unter 0,05 GWh an mindestens drei aufeinanderfolgenden Tagen. Quelle: Energy-Charts Last und Erzeugung, Viertelstunden. Unsicherheit: Überschuss ist Σ max(0, Wind+Sonne − Last) × 0,25 h, nicht die SMARD-Überschussdefinition.",
  },
  {
    id: "insight-hohes-minimum",
    title: "Hohes Minimum ohne Ladefenster",
    body: "Regel: Überschuss unter 0,05 GWh, Tages-Spanne mindestens 80 €/MWh, Tagesminimum mindestens 100 €/MWh, keine Viertelstunde unter null. Quelle: Day-Ahead DE-LU (Bundesnetzagentur | SMARD.de, CC BY 4.0).",
  },
  {
    id: "insight-preis-spike",
    title: "Preis-Spike auf leerem Tag",
    body: "Regel: Überschuss unter 0,05 GWh und Tagesmaximum mindestens 400 €/MWh. Quelle: Day-Ahead DE-LU. Unsicherheit: eine Viertelstunde kann das Maximum tragen.",
  },
  {
    id: "insight-negativpreis",
    title: "Negative Preise",
    body: "Regel: Stunden unter null als Summe der Viertelstunden × 0,25 h, Schwelle 0,25 h im Fenster. Quelle: Day-Ahead DE-LU.",
  },
  {
    id: "insight-gleiche-spanne",
    title: "Gleiche Spanne, anderes Niveau",
    body: "Regel: zwei Tage im Fenster, Spannen differieren um höchstens 20 €/MWh, Minima um mindestens 100 €/MWh. Quelle: Day-Ahead DE-LU.",
  },
  {
    id: "insight-flotte-spitze",
    title: "Flotte gegen Abendspitze",
    body: "Regel: Überschuss unter 0,05 GWh, Modell-Ladung 0 GWh, Nennleistung der Referenzflotte unter 15 % der beobachteten Abend-Restlastspitze. Quelle: Energy-Charts + Battery-Charts-Referenzflotte am Datenstand der Startseite.",
  },
  {
    id: "insight-preis-regime",
    title: "Preisniveau-Regime",
    body: "Regel: mindestens sieben Tage in Folge mit Tagesminimum ab 150 €/MWh. Quelle: Day-Ahead DE-LU im gewählten Kalenderfenster.",
  },
  {
    id: "insight-drei-ziele",
    title: "Drei Ziele, ein Monat",
    body: "Regel: Oktober-Lauf, dieselbe Modellflotte 4,58 GW / 8 GWh bei ×1; Satz erscheint, wenn Marktfahrweise mehr als fünfmal so viel netzseitige Ladung bewegt wie Spitzenfahrweise und die Markt-Spitzenwirkung unter 1 GW bleibt. Quelle: vorberechnetes Monats-Bundle (Energy-Charts Last/Erzeugung). Vergleichschart: Spitze nach Speicher in GW je Faktor ×1–×10.",
  },
  {
    id: "insight-saettigung",
    title: "Sättigung des Überschuss-Pools",
    body: "Regel: ×10 nimmt mindestens 99 % des beobachteten Überschuss-Pools im 30-Tage-Fenster auf, ×1 unter 40 %. Quelle: Überschuss-Kette mit 17:00-Grenze und diskreten Faktoren. Keine Euro-Skalierung.",
  },
] as const;

export function MethodikInsights() {
  return (
    <section className="v4-chapter" id="insights" aria-labelledby="insights-h">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Insights</p>
        <h2 id="insights-h" className="v4-chapter-h2">
          Regelbasierte Sätze aus öffentlichen Reihen
        </h2>
        <p className="v4-subline">
          Keine Laufzeit-KI. Jeder Satz auf der Seite gehört zu einer festen Schwelle; die Zahlen kommen aus denselben
          Reihen wie die Graphen.
        </p>
      </div>
      <dl className="v4-content methodik-insights-dl">
        {RULES.map((rule) => (
          <div key={rule.id} id={rule.id} className="methodik-insights-row">
            <dt className="v4-chapter-h2 methodik-insights-dt">{rule.title}</dt>
            <dd className="v4-subline methodik-insights-dd">{rule.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
