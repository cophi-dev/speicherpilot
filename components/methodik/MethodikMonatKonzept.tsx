import { FLEET_XK_FOOTNOTE_DE } from "@/lib/fleetXkConvention";
import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

export function MethodikMonatKonzept() {
  const gw = (NATIONAL_BASE_FLEET.powerMw / 1000).toFixed(2).replace(".", ",");
  const gwh = (NATIONAL_BASE_FLEET.energyMwh / 1000).toFixed(2).replace(".", ",");
  const h = (NATIONAL_BASE_FLEET.energyMwh / NATIONAL_BASE_FLEET.powerMw).toFixed(2).replace(".", ",");
  return (
    <section className="v4-content methodik-section" id="monat-konzept-ac" aria-labelledby="methodik-monat-ac-title">
      <h2 id="methodik-monat-ac-title" className="v4-chapter-h2">
        Monatsseite: Restlastspitze, Stunden und Überschuss-Pool
      </h2>
      <ul className="methodik-insights-footnotes">
        <li>
          <strong>Kernantwort 1 (Hero):</strong> Höchste Monats-Restlast in GW (absolut), nicht Senkung. Drei Fahrweisen:
          spitzenorientiert, Überschuss, Markt ab ×3 ohne Preisrückwirkung (gestrichelt/schraffiert). Referenzlinie =
          beobachtete Oktober-Spitze.
        </li>
        <li>
          <strong>Kernantwort 3:</strong> Spitzensenkung je Flottenstufe ×1/×2/×5/×10 für 1,76 h, 2 h und 4 h bei gleicher
          Nennleistung (separate MIP-Läufe).
        </li>
        <li>
          <strong>Kernantwort 4:</strong> Anteil des Modell-Pools Σ max(0, Wind+Sonne−Last) und Spitzensenkung bei
          Überschuss-Strategie; Vergleich zu spitzenorientiert bei ×10.
        </li>
        <li>
          <strong>Flottenbasis:</strong> {gw} GW / {gwh} GWh (≈ {h} h), battery-charts Großspeicher 31.10.2026.{" "}
          {FLEET_XK_FOOTNOTE_DE}
        </li>
        <li>
          Annahmen: Round-Trip 85&nbsp;%, SoC 10–90&nbsp;%, Price Taker, nur Day-Ahead, Vollvoraussicht, ohne
          Preisrückwirkung bei ×5/×10-Marktlinie.
        </li>
        <li>
          Euro nur bei Markt ×1 als Modellschätzung (Day-Ahead-Arbitrage im Modell, ohne Entgelte/Degradation).
        </li>
        <li>Quelle: Energy-Charts / Bundesnetzagentur | SMARD.de, CC BY 4.0. Oktober-Läufe: Bundle im Repo.</li>
      </ul>
    </section>
  );
}
