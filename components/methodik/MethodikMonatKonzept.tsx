import { FLEET_XK_FOOTNOTE_DE } from "@/lib/fleetXkConvention";
import { formatQuantity } from "@/lib/formatQuantity";
import { MONAT_V1_KERN3 } from "@/lib/monatV1Format";
import { marktAdditionEurMio } from "@/lib/monatV1Model";
import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";
import { monthStatsForRun } from "@/lib/nationalMonthFleetModel";
import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { SimulatorLegalBox } from "@/components/monat-v1/SimulatorLegalBox";
import { loadEps70Teaser } from "@/lib/simulatorTeaser.server";

export async function MethodikMonatKonzept() {
  const gw = (NATIONAL_BASE_FLEET.powerMw / 1000).toFixed(2).replace(".", ",");
  const gwh = (NATIONAL_BASE_FLEET.energyMwh / 1000).toFixed(2).replace(".", ",");
  const h = (NATIONAL_BASE_FLEET.energyMwh / NATIONAL_BASE_FLEET.powerMw).toFixed(2).replace(".", ",");
  const bundle = loadNationalFleetMonthBundle();
  const eurMio = marktAdditionEurMio(bundle);
  const eurLabel = eurMio != null ? formatQuantity(eurMio, "de", 1) : "—";
  const markt10Gw = formatQuantity(monthStatsForRun(bundle, 10, "markt").peakAfterGw, "de", 2);
  const teaser = loadEps70Teaser();
  return (
    <>
    <section className="v4-content methodik-section" id="monat-konzept-ac" aria-labelledby="methodik-monat-ac-title">
      <h2 id="methodik-monat-ac-title" className="v4-chapter-h2">
        Monatsseite: Restlastspitze, Stunden und Überschuss-Pool
      </h2>
      <ul className="methodik-insights-footnotes">
        <li>
          <strong>Kernantwort 1 (Hero):</strong> Höchste Monats-Restlast in GW (absolut), nicht Senkung. Drei Fahrweisen:
          spitzenorientiert, Überschuss, Markt ohne Preisrückwirkung (gestrichelt/schraffiert), über der beobachteten Spitze ab ≈×3,9 (×10: {markt10Gw} GW). Referenzlinie =
          beobachtete Oktober-Spitze.
        </li>
        <li>
          <strong>Kernantwort 3:</strong> {MONAT_V1_KERN3}. Darstellung je Flottenstufe ×1/×2/×5/×10 für 1,76 h, 2 h
          und 4 h bei gleicher Nennleistung (separate MIP-Läufe).
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
          Euro nicht auf der Monatsseite. In der Methodik: heutige Flotte, marktgeführt, eine × zusätzlich (×2 im
          Modell) ≈ {eurLabel}&nbsp;Mio&nbsp;€ Modellschätzung (Day-Ahead, ohne Entgelte/Degradation).
        </li>
        <li>Quelle: Energy-Charts / Bundesnetzagentur | SMARD.de, CC BY 4.0. Oktober-Läufe: Bundle im Repo.</li>
        <li id="simulator-kipppunkt">
          <strong>Simulator · Kipppunkt:</strong> analytisch 64&nbsp;428&nbsp;MW (21.10. 14:00, Restlast 50,96&nbsp;GW
          plus Voll-Laden bei k≈3,9). Abweichung zu interpolierten MIP-Werten (z. B. 64&nbsp;416&nbsp;MW) =
          Rundung/Interpolation, kein Modellbruch.
        </li>
      </ul>
    </section>
    <section className="v4-content methodik-section" id="simulator-annahmen" aria-labelledby="methodik-simulator-title">
      <h2 id="methodik-simulator-title" className="v4-chapter-h2">
        Simulator: Annahmen und Rechtsrahmen
      </h2>
      <ul className="methodik-insights-footnotes">
        <li>
          <strong>Default:</strong> Kompromiss ε-70 — 70&nbsp;% der Monatssenkung bei {teaser.costPctText} Erlösverzicht
          (Flotte ×2, Modellschätzung).
        </li>
        <li>
          Flotte fest ×2, ohne Preisrückwirkung (in den Graphen so gekennzeichnet). Kein interaktiver Rückkopplungs-Lauf.
        </li>
        <li>
          Kipppunkt nur als Hinweislinie, nicht als Steuergröße. Herleitung: 21.10. 14:00, beobachtete Restlast 50,96&nbsp;GW
          plus Voll-Laden der Flotte bei k≈3,9 ergibt analytisch 64&nbsp;428&nbsp;MW (siehe{" "}
          <a href="#simulator-kipppunkt" className="v4-text-link">
            oben
          </a>
          ).
        </li>
        <li id="simulator-endpunkte">
          Die Endpunkte der Front (Max. Erlös, Netzdienlich) sind lexikographisch: erst das eine Ziel, dann das andere.
          Ohne das zweite Ziel lieferte der Spitzen-Löser bei ×2 einen „Erlös“ von −3,08 Mio.&nbsp;€ — ein
          Löser-Artefakt, nicht der Preis der Netzdienlichkeit.
        </li>
        <li>
          Euro ausschließlich als Modellschätzung (Day-Ahead, ohne Entgelte, Degradation, Intraday).
        </li>
        <li>
          National, kein Netzengpass, Vollvoraussicht, Price Taker, nur Day-Ahead. Round-Trip 85&nbsp;%, SoC 10–90&nbsp;%.
        </li>
      </ul>
      <SimulatorLegalBox />
    </section>
    </>
  );
}
