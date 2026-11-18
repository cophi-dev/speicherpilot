import { MethodikSection } from "@/components/methodik/MethodikSection";

export function MethodikKnoten() {
  return (
    <MethodikSection id="knoten-modell" title="Modellknoten (/knoten)">
      <p>
        Auf <a href="/knoten" className="v4-text-link">/knoten</a> rechnen wir drei gedachte Umspannwerke (Wind Nord, Solar Süd,
        Stadt) mit fester Grenze von 80{"\u00A0"}MW in beiden Richtungen (2 × 40{"\u00A0"}MVA HS/MS, cos{"\u00A0"}φ{"\u00A0"}= 1,
        n-0, SimBench <code>1-MV-semiurb--0-no_sw</code>). Profile kommen aus SMARD-Regelzonen (Form), skaliert auf nationale
        Kapazitätsfaktoren (Energy-Charts). Speichergröße am Knoten folgt der bundesweiten Flottendichte × Stufe.
      </p>
      <h3 className="v4-chapter-h3">Warum wir nur eine Grenze rechnen</h3>
      <p>
        Die frühere Seite <code>/netz</code> mit pandapower-Lastfluss, (n-1) und Strangbild war für die Leserin zu schwer
        zugänglich. Für „dein Knoten“ zeigen wir deshalb bewusst nur eine Lastflussgrenze am Umspannwerk — ohne Spannung,
        Blindleistung, Strang oder (n-1). Das ersetzt keine Netzprüfung; es liefert Szenariozahlen für Verhandlungen über
        flexible Netzanschlussvereinbarungen (§{"\u00A0"}17 Abs.{"\u00A0"}2b EnWG).
      </p>
      <h3 className="v4-chapter-h3">Grenzen und Quellen</h3>
      <ul>
        <li>Modellknoten, kein realer Standort; Belegung ist die größte Unsicherheit (Chips: 10{"\u00A0"}% Reserve, knapp voll, 25{"\u00A0"}% drüber).</li>
        <li>Day-Ahead DE-LU, Vollvoraussicht, Preisnehmer; Speicher ändern den Preis nicht.</li>
        <li>Echte Engpässe sitzen überwiegend im Übertragungsnetz — unser Umspannwerk-Modell ist die untere Ebene.</li>
        <li>
          Rohdaten: SMARD chart_data (CC BY 4.0), Energy-Charts public_power/price (CC BY 4.0), battery-charts 31.10.2026;
          Rechnung <code>scripts/knoten/model.py</code>, Export{"\u00A0"}
          <code>scripts/knoten/export_static_data.py</code>.
        </li>
      </ul>
      <p>
        Wir bewerten nicht mit dem Urteil „netzdienlich“. Markt und knotentreu verfolgen denselben Erlös; knotentreu hält die
        Grenze zusätzlich ein.
      </p>
    </MethodikSection>
  );
}