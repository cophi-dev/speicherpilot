import { dreiZieleMethodikBullets } from "@/lib/methodikDreiZiele";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";

const RULES = [
  {
    id: "insight-trockenstrecke",
    title: "Trockenstrecke",
    bullets: [
      "Formel: Überschuss < 0,05 GWh und dryStreak ≥ 3 aufeinanderfolgende Kalendertage.",
      "Daten: Energy-Charts Last/Erzeugung, Viertelstunden; Fenster 10.10.–08.11.2026.",
      "Quelle: gleiche Tagesreihe wie Start/Tag.",
      "Gegenrechnung: 8.11.2026, Überschuss 0 GWh, dryStreak 14.",
      "Grenzfall: Ein Tag mit 0,04 GWh bricht die Serie nicht; ab 0,05 GWh zählt er als Überschusstag.",
    ],
  },
  {
    id: "insight-hohes-minimum",
    title: "Hohes Minimum ohne Ladefenster",
    bullets: [
      "Formel: Überschuss < 0,05 GWh, Spanne ≥ 80 €/MWh, Tagesminimum ≥ 100 €/MWh, keine Viertelstunde < 0 €/MWh.",
      "Daten: Day-Ahead DE-LU, Tages-Min/Max aus Viertelstundenreihe.",
      "Quelle: Bundesnetzagentur | SMARD.de, CC BY 4.0.",
      "Gegenrechnung: 8.11.2026, min 206,09 €/MWh, max 321,50 €/MWh, Spanne 115,41 €/MWh.",
      "Grenzfall: pmin genau 100 €/MWh feuert; 99,99 €/MWh nicht.",
    ],
  },
  {
    id: "insight-preis-spike",
    title: "Preis-Spike auf leerem Tag",
    bullets: [
      "Formel: Überschuss < 0,05 GWh und Tagesmaximum ≥ 400 €/MWh.",
      "Daten: Day-Ahead DE-LU, Viertelstunden.",
      "Quelle: Bundesnetzagentur | SMARD.de.",
      "Gegenrechnung: 29.10.2026, Überschuss 0 GWh, max 574,28 €/MWh (17:15).",
      "Grenzfall: 8.11.2026 max 321,5 €/MWh — Regel schweigt.",
    ],
  },
  {
    id: "insight-negativpreis",
    title: "Negative Preise",
    bullets: [
      "Formel: Σ(Viertelstunden mit Preis < 0) × 0,25 h ≥ 0,25 h im Fenster.",
      "Daten: 10.10.–08.11.2026.",
      "Quelle: Day-Ahead DE-LU.",
      "Gegenrechnung: 1,75 h gesamt — 10.10. 0,25 h, 25.10. 1,5 h.",
      "Grenzfall: Ein Viertelstunde mit −0,01 €/MWh zählt als 0,25 h.",
    ],
  },
  {
    id: "insight-gleiche-spanne",
    title: "Gleiche Spanne, anderes Niveau",
    bullets: [
      "Formel: Zwei Tage, |Spanne₁ − Spanne₂| ≤ 20 €/MWh und |pmin₁ − pmin₂| ≥ 100 €/MWh.",
      "Daten: Tages-Spanne max − min je Kalendertag.",
      "Quelle: Day-Ahead DE-LU.",
      "Gegenrechnung: 10.10. und 12.10.2026, Spannen ~gleich, Minima um >100 €/MWh auseinander.",
      "Grenzfall: ΔSpanne 21 €/MWh — kein Paar.",
    ],
  },
  {
    id: "insight-flotte-spitze",
    title: "Flotte gegen Abendspitze",
    bullets: [
      "Formel: Überschuss < 0,05 GWh, Modell-Ladung 0 GWh, Flottenleistung / Abend-Restlast < 15 %.",
      "Daten: Battery-Charts-Referenzflotte, beobachtete Abendspitze Residuallast.",
      "Quelle: Energy-Charts + Tageskennzahl eveningPeakGw.",
      "Gegenrechnung: 8.11.2026, 4,64 GW / 58,5 GW ≈ 7,9 %.",
      "Grenzfall: 15,0 % Schwelle — knapp darunter feuert.",
    ],
  },
  {
    id: "insight-preis-regime",
    title: "Preisniveau-Regime",
    bullets: [
      "Formel: mindestens 7 aufeinanderfolgende Tage mit Tagesminimum ≥ 150 €/MWh.",
      "Daten: pmin je Tag im Fenster.",
      "Quelle: Day-Ahead DE-LU.",
      "Gegenrechnung: 28.10.–08.11.2026, 12 Tage in Folge.",
      "Grenzfall: Sechs Tage — Regel schweigt.",
    ],
  },
  {
    id: "insight-drei-ziele",
    title: "Drei Ziele, ein Monat",
    bullets: [] as string[],
  },
  {
    id: "insight-saettigung",
    title: "Sättigung des Überschuss-Pools",
    bullets: [
      "Formel: ×10 absorbedShare ≥ 99 % und ×1 absorbedShare < 40 % im 30-Tage-Überschuss-Modell.",
      "Daten: Überschuss-Kette, diskrete Faktoren, 17:00-Grenze.",
      "Quelle: Energy-Charts, gleiche Kette wie Start-Balken.",
      "Gegenrechnung: Fenster Herbst, ×1 28 %, ×10 100 % (Start-Hero).",
      "Grenzfall: Keine Euro-Skalierung; nur GWh-Anteile.",
    ],
  },
] as const;

export async function MethodikInsights() {
  const bundle = loadNationalFleetMonthBundle();
  const dreiZiele = dreiZieleMethodikBullets(bundle);
  const rules = RULES.map((rule) =>
    rule.id === "insight-drei-ziele" ? { ...rule, bullets: dreiZiele } : rule,
  );
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
      <div className="v4-content methodik-insights-rules">
        {rules.map((rule) => (
          <article key={rule.id} id={rule.id} className="methodik-insights-row">
            <h3 className="methodik-insights-dt">{rule.title}</h3>
            <ul className="methodik-insights-footnotes">
              {rule.bullets.map((line) => (
                <li key={line.slice(0, 24)}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
