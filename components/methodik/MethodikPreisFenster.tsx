import { formatQuantity } from "@/lib/formatQuantity";
import { computeDauerSpanne } from "@/lib/preisFenster";

/**
 * Fixed hand check, 8 November 2026, fleet snapshot 4.64 GW / 8.14 GWh.
 * Prices are the five cheapest and five dearest DE-LU quarter-hours that day.
 */
const HAND_POINTS = [
  { hm: "00:00", eurPerMwh: 251.92 },
  { hm: "10:30", eurPerMwh: 208.46 },
  { hm: "13:30", eurPerMwh: 208.11 },
  { hm: "13:45", eurPerMwh: 208.24 },
  { hm: "14:00", eurPerMwh: 207.18 },
  { hm: "15:00", eurPerMwh: 206.09 },
  { hm: "17:45", eurPerMwh: 321.5 },
  { hm: "18:30", eurPerMwh: 319.69 },
  { hm: "18:45", eurPerMwh: 318.15 },
  { hm: "19:30", eurPerMwh: 319.93 },
  { hm: "20:00", eurPerMwh: 320 },
  { hm: "23:45", eurPerMwh: 215.97 },
];

const HAND_POWER_GW = 4.64;
const HAND_ENERGY_GWH = 8.14;

export function MethodikPreisFenster() {
  const dauer = computeDauerSpanne(HAND_POINTS, HAND_POWER_GW, HAND_ENERGY_GWH);
  const lowSum = 206.09 + 207.18 + 208.11 + 208.24 + 208.46;
  const highSum = 321.5 + 320 + 319.93 + 319.69 + 318.15;

  return (
    <section className="v4-chapter" id="preis-fenster" aria-labelledby="preis-fenster-h">
      <div className="v4-chapter-head v4-content">
        <p className="v4-chapter-num num">Preis</p>
        <h2 id="preis-fenster-h" className="v4-chapter-h2">
          Dauer-Spanne eines Tages
        </h2>
        <p className="v4-subline">
          Die Kennzahl sagt, wie weit die günstigsten und die teuersten Viertelstunden auseinanderliegen, gemessen an
          der Energie, die in die heutige Flotte passt. Sie ist kein Erlös und wird nicht mit ×2, ×5 oder ×10
          multipliziert.
        </p>
      </div>
      <div className="v4-content v4-footnote">
        <p>
          Nutzbare Energie E = 0,8 × Nennenergie. Das ist das Fenster 10–90 %. Stunden bei Nennleistung t = E / P. Zahl
          der Viertelstunden n = ⌊t / 0,25⌋. Dauer-Spanne = Mittel der n teuersten Preise minus Mittel der n günstigsten
          Preise. Einheit €/MWh. Bei gleichem Preis bleibt die frühere Viertelstunde auf der günstigen Seite.
        </p>
        <p>
          Quelle: Day-Ahead der Gebotszone DE-LU, Energy-Charts, Lizenzfeld CC BY 4.0, Bundesnetzagentur | SMARD.de.
          Abruf der Gegenrechnung: 9. November 2026. Dieselbe Spanne des Tages steht in der SMARD-Reihe Filter 4169.
          SMARD prüft die Lizenz der Großhandelspreise im Verfahren HEDWIG. EPEX wird hier nicht abgefragt.
        </p>
        <p>
          Unsicherheit: eine Statistik der Auktion, keine Fahrweise. Ob die günstigen Stunden vor den teuren liegen,
          steht als eigener Satz daneben. Der Wirkungsgrad 85 % ist nicht eingerechnet, deshalb kein Euro-Betrag. Eine
          Viertelstunde kann den Mittelwert ziehen. n hängt am Flottenstand des Tages. Der 25. Oktober 2026 hat wegen
          der Zeitumstellung 100 Viertelstunden. Mehr Speicher würde die Preise in Wirklichkeit verschieben. Ab ×2 gibt
          es deshalb keinen Euro-Erlös.
        </p>
        <p>
          Gegenrechnung 8. November 2026, Flotte {formatQuantity(HAND_POWER_GW, "de", 2)} GW /{" "}
          {formatQuantity(HAND_ENERGY_GWH, "de", 2)} GWh. E = 0,8 × 8,14 = 6,512 GWh. t = 6,512 / 4,64 = 1,403 h. n =
          ⌊1,403 / 0,25⌋ = 5. Günstig, in der Uhrzeit: 10:30 208,46 · 13:30 208,11 · 13:45 208,24 · 14:00 207,18 · 15:00
          206,09. Summe {formatQuantity(lowSum, "de", 2)}, Mittel {dauer ? formatQuantity(dauer.meanLow, "de", 3) : "—"}.
          Teuer: 17:45 321,50 · 18:30 319,69 · 18:45 318,15 · 19:30 319,93 · 20:00 320,00. Summe{" "}
          {formatQuantity(highSum, "de", 2)}, Mittel {dauer ? formatQuantity(dauer.meanHigh, "de", 3) : "—"}.
          Dauer-Spanne {dauer ? formatQuantity(dauer.dauerSpanne, "de", 3) : "—"} €/MWh. Die günstigen Stunden enden um
          15:00, die teuren beginnen um 17:45.
        </p>
        <p>
          Volle Spanne desselben Tages, zum Vergleich: 321,50 − 206,09 = 115,41 €/MWh. Die Dauer-Spanne liegt darunter,
          weil sie fünf Viertelstunden mittelt und nicht nur die beiden Extreme nimmt. Das Überschuss-Modell lädt an
          diesem Tag 0,0 GWh. Beides bleibt stehen.
        </p>
      </div>
    </section>
  );
}
