import { GlossaryTip } from "@/components/GlossaryTip";
import type { AppLanguage } from "@/components/language-context";
import report from "@/data/netz/pruefung.json";
import { formatQuantity } from "@/lib/formatQuantity";
import { checkedOutages, loadNetzDemo } from "@/lib/netzDemo";

function small(value: number, language: AppLanguage): string {
  if (value === 0) {
    return formatQuantity(0, language, 0);
  }
  const digits = Math.min(12, Math.max(0, Math.ceil(-Math.log10(Math.abs(value))) + 1));
  return formatQuantity(value, language, digits);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

export function NetzMethodik({ language }: { language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const data = loadNetzDemo();
  const hl = data.cases.hL.base;
  const lpv = data.cases.lPV.base;
  const hlN1 = checkedOutages(hl);
  const lpvN1 = checkedOutages(lpv);
  const cables = data.lines.filter((line) => line.kind === "cs").length;
  const overhead = data.lines.filter((line) => line.kind === "ol").length;
  const openEnds = data.lines.filter((line) => line.openEnd).length;
  const hlLoad = data.tipping["hL|laden"] ?? [];
  const num = (value: number, digits = 1) => formatQuantity(value, language, digits);
  const pu = (value: number) => formatQuantity(value, language, 4);

  return (
    <section id="netz">
      <h2>{tx("11 Netzwirkung im Testnetz", "11 Grid effect in a test grid")}</h2>
      <p>
        {tx(
          "Die Seite /netz schlägt einen vorab gerechneten Lastfluss nach. Sie rechnet nichts im Browser. Ein Speicher sitzt an einem von vier Knoten, mit 2, 5, 10 oder 20 MW, laden oder entladen.",
          "The page /netz looks up a load flow that was calculated in advance. It calculates nothing in the browser. A storage unit sits at one of four nodes, at 2, 5, 10 or 20 MW, charging or discharging."
        )}{" "}
        <GlossaryTip id="lastfluss" language={language} />
      </p>
      <h3>{tx("Netz und Studienfälle", "Grid and study cases")}</h3>
      <p>
        {tx(
          `Das Netz ist das öffentliche Mittelspannungs-Testnetz SimBench 1-MV-semiurb--0-no_sw, halbstädtisch, 20 kV. Im Strangbild stehen ${data.mvBusIds.length} Mittelspannungsknoten, ${data.lines.length} Leitungen (${cables} Kabel, ${overhead} Freileitung, ${openEnds} offene Trennstellen) und ${data.trafos.length} Transformatoren zu je ${num(data.trafos[0]?.snMva ?? 40, 0)} MVA. Dazu kommt ein Hochspannungsknoten, der nicht in der Karte liegt.`,
          `The grid is the public medium-voltage test grid SimBench 1-MV-semiurb--0-no_sw, semi-urban, 20 kV. The feeder diagram has ${data.mvBusIds.length} medium-voltage nodes, ${data.lines.length} lines (${cables} cables, ${overhead} overhead lines, ${openEnds} open tie switches) and ${data.trafos.length} transformers of ${num(data.trafos[0]?.snMva ?? 40, 0)} MVA each. One high-voltage node is not on the map.`
        )}{" "}
        <GlossaryTip id="testnetz" language={language} />
      </p>
      <p>
        {tx(
          `Gerechnet werden zwei Fälle. Starklast, SimBench-Kürzel hL: Lastfaktor 1, keine dezentrale Erzeugung, Leistungsfaktor 0,93, Sollwert der Sammelschiene ${num(data.taps.hL?.setpointPu ?? 1.035, 3)} p.u. Der Stufensteller steht fest auf ${data.taps.hL?.tapPos ?? "—"}; die Sammelschiene liegt dann bei ${pu(data.taps.hL?.busbarPu ?? 0)} p.u. Schwachlast mit Sonne und Wind, SimBench-Kürzel lPV: niedrige Last, hohe Einspeisung, Leistungsfaktor 0,90, Sollwert ${num(data.taps.lPV?.setpointPu ?? 1.015, 3)} p.u., Stufensteller ${data.taps.lPV?.tapPos ?? "—"}, Sammelschiene ${pu(data.taps.lPV?.busbarPu ?? 0)} p.u. Die anderen vier SimBench-Fälle sind nicht gerechnet. Es gibt keine Spannungsregelung.`,
          `Two cases are calculated. Peak load, SimBench code hL: load factor 1, no distributed generation, power factor 0.93, busbar setpoint ${num(data.taps.hL?.setpointPu ?? 1.035, 3)} p.u. The tap is fixed at ${data.taps.hL?.tapPos ?? "—"}; the busbar is then at ${pu(data.taps.hL?.busbarPu ?? 0)} p.u. Low load with sun and wind, SimBench code lPV: low load, high feed-in, power factor 0.90, setpoint ${num(data.taps.lPV?.setpointPu ?? 1.015, 3)} p.u., tap ${data.taps.lPV?.tapPos ?? "—"}, busbar ${pu(data.taps.lPV?.busbarPu ?? 0)} p.u. The other four SimBench cases are not calculated. There is no voltage control.`
        )}{" "}
        <GlossaryTip id="starklast" language={language} /> <GlossaryTip id="schwachlast-pv" language={language} /> <GlossaryTip id="stufensteller" language={language} />
      </p>
      <p>
        {tx(
          "Ohne Speicher, Starklast: Spannung ",
          "Without storage, peak load: voltage "
        )}
        {hl.vmin != null && hl.vmax != null ? `${pu(hl.vmin)}–${pu(hl.vmax)} p.u.` : "—"}
        {tx(", höchste Leitung ", ", highest line ")}
        {hl.lineMax != null ? `${num(hl.lineMax)} %` : "—"}
        {tx(", höchster Transformator ", ", highest transformer ")}
        {hl.trafoMax != null ? `${num(hl.trafoMax)} %` : "—"}.
        {tx(" Schwachlast mit Sonne und Wind: ", " Low load with sun and wind: ")}
        {lpv.vmin != null && lpv.vmax != null ? `${pu(lpv.vmin)}–${pu(lpv.vmax)} p.u.` : "—"}
        {lpv.lineMax != null ? `, ${tx("Leitung", "line")} ${num(lpv.lineMax)} %` : ""}
        {lpv.trafoMax != null ? `, ${tx("Transformator", "transformer")} ${num(lpv.trafoMax)} %` : ""}.
      </p>
      <h3>{tx("Grenzen", "Limits")}</h3>
      <p>
        {tx(
          "Im Normalbetrieb gilt für die Mittelspannung das Band 0,965 bis 1,055 p.u. Im Einzelausfall gilt 0,915 bis 1,055 p.u. Leitungen und Transformatoren dürfen 100 % des Dauerstroms erreichen, auch im Einzelausfall. Quelle: Meinecke et al., CIRED 2019, Paper 0139, und die Spannungsgrenzen im SimBench-Datensatz. Die 2-%-Regel für die Spannungsanhebung durch Erzeuger wird nicht verwendet.",
          "In normal operation the medium-voltage band is 0.965 to 1.055 p.u. For a single outage it is 0.915 to 1.055 p.u. Lines and transformers may reach 100 % of their continuous current, also in a single outage. Source: Meinecke et al., CIRED 2019, paper 0139, and the voltage limits in the SimBench data set. The 2 % rule for the voltage rise from generators is not used."
        )}{" "}
        <GlossaryTip id="spannung-pu" language={language} /> <GlossaryTip id="auslastung" language={language} />
      </p>
      <h3>{tx("Formeln", "Formulas")}</h3>
      <p>
        {tx(
          "An jedem Knoten gilt die Knotengleichung: die Summe der Ströme ist null, und die eingespeiste Scheinleistung ist Spannung mal konjugiertem Strom. Der Spannungsabfall einer Leitung ist näherungsweise (R·P + X·Q) geteilt durch das Quadrat der Spannung. Die Auslastung ist der Strom geteilt durch den erlaubten Dauerstrom. Der Kipppunkt ist die größte Leistung im Raster 0,1 MW, bei der im Normalbetrieb alle diese Grenzen halten und der Lastfluss konvergiert. Die Suche endet bei 100 MW; dieser Wert heißt mindestens 100 MW.",
          "At every node the current sum is zero, and the injected apparent power is voltage times the conjugate current. The voltage drop of a line is approximately (R·P + X·Q) divided by the square of the voltage. Loading is the current divided by the permitted continuous current. The tipping point is the largest power on a 0.1 MW grid at which all these limits hold in normal operation and the load flow converges. The search stops at 100 MW; that value means at least 100 MW."
        )}{" "}
        <GlossaryTip id="hosting-capacity" language={language} />
      </p>
      <p>
        {tx(
          `Für Starklast und Laden liegen die Kipppunkte der ${hlLoad.length} Knoten zwischen ${num(Math.min(...hlLoad))} und ${num(Math.max(...hlLoad))} MW, Median ${num(median(hlLoad))}. Der Kipppunkt sagt nichts über (n-1).`,
          `For peak load and charging, the tipping points of the ${hlLoad.length} nodes lie between ${num(Math.min(...hlLoad))} and ${num(Math.max(...hlLoad))} MW, median ${num(median(hlLoad))}. The tipping point says nothing about (n-1).`
        )}
      </p>
      <h3>{tx("Handrechnung, zwei Knoten", "Hand calculation, two nodes")}</h3>
      <p>
        {tx(
          "Knoten 1 liegt fest bei 1,0 p.u., das sind 20 kV. Die Leitung ist 5 km lang, 0,2 + j0,1 Ohm je km, ohne Ladestrom. Die Last an Knoten 2 ist 3 MW + j1 Mvar. Bezugsleistung 1 MVA, Bezugsimpedanz 400 Ohm. Mit R und X und P und Q in dieser Bezugsgröße gilt V₂² = [A + Wurzel(A² − 4·|Z|²·|S|²)] / 2, mit A = V₁² − 2·(R·P + X·Q). Das Ergebnis ist V₂ = 0,991171 p.u. und Verluste 0,025447 MW. Dieselbe Zahl liefern pandapower und der eigene Nachrechner, auf sechs Stellen.",
          "Node 1 is fixed at 1.0 p.u., which is 20 kV. The line is 5 km long, 0.2 + j0.1 ohm per km, with no charging current. The load at node 2 is 3 MW + j1 Mvar. Base power 1 MVA, base impedance 400 ohm. With R, X, P and Q in that base, V₂² = [A + square root(A² − 4·|Z|²·|S|²)] / 2, with A = V₁² − 2·(R·P + X·Q). The result is V₂ = 0.991171 p.u. and losses of 0.025447 MW. pandapower and the separate checker give the same figure, to six digits."
        )}
      </p>
      <h3>{tx("(n-1)", "(n-1)")}</h3>
      <p>
        {tx(
          "Gerechnet wird der Ausfall jeder Leitung und jedes Transformators, 123 Fälle. Geschaltet wird nicht nur bei einer Insel. Ist der Ausfall verletzt, probiert der Code die offenen Trennstellen: bei unversorgten Knoten nur solche, die die Insel mit einem versorgten Nachbarn verbinden, sonst alle. Die beste einzelne Trennstelle bleibt, wenn sie besser ist als Nichtschalten. Liegt das Ergebnis danach noch außerhalb, kann der Code eine Leitung in der entstandenen Schleife öffnen und diese Paarung behalten, wenn sie besser ist. Ein Zustand, der schon im Normalbetrieb Grenzen verletzt, bekommt keinen Einzelausfall.",
          "The calculation removes every line and every transformer, 123 cases. Switching is not limited to islands. If the outage violates the limits, the code tries the open tie switches: when nodes are unsupplied, only ties that join the island to a supplied neighbour, otherwise every tie. The best single tie is kept when it is better than switching nothing. If the result is still outside, the code can open one line in the loop that appears and keep that pair when it is better. A state that already violates the limits in normal operation gets no outage calculation."
        )}{" "}
        <GlossaryTip id="n-1" language={language} /> <GlossaryTip id="trennstelle" language={language} />
      </p>
      <p>
        {tx(
          `Das Testnetz ist ein Lehrnetz mit vereinfachter Schaltstrategie. In der Starklast verletzen ${hlN1?.failed ?? "—"} von 123 Ausfällen die Grenzen, in der Schwachlast mit Sonne und Wind ${lpvN1?.failed ?? "—"}. In der Starklast betreffen fünf dieser Fälle Stichleitungen mit ein oder zwei Knoten ohne Rückfallverbindung. Die Seite zeigt deshalb Unterschiede gegenüber dem Fall ohne Speicher.`,
          `The test grid is a teaching grid with a simplified switching rule. At peak load, ${hlN1?.failed ?? "—"} of 123 outages violate the limits, and at low load with sun and wind ${lpvN1?.failed ?? "—"}. At peak load, five of these cases are spurs with one or two nodes and no alternative path. The page therefore shows the difference from the case without storage.`
        )}
      </p>
      <h3>{tx("Prüfung", "Check")}</h3>
      <p>
        {tx(
          `Ein zweiter Rechner baut die Leitwertmatrix selbst und löst mit eigenem Newton-Raphson. Er prüft Normalbetrieb und Kipppunkte. Er nutzt von pandapower nur die Tabellen, nicht den Löser, und bildet den Transformator als π-Glied ab. In diesem Lauf sind ${report.states} Zustände im Normalbetrieb gegengerechnet. Die größte Abweichung ist ${small(report.duPu, language)} p.u. bei der Spannung, ${small(report.dLinePct, language)} Prozentpunkte bei der Leitungsauslastung, ${small(report.dTrafoPct, language)} Prozentpunkte beim Transformator und ${small(report.dPMw, language)} MW beim Bezug. Die Energiebilanz des Nachrechners ist höchstens ${small(report.balanceNrMw, language)} MW, die der gerundeten Datei höchstens ${small(report.balanceJsonMw, language)} MW. Widersprüche zwischen Kipppunkt und Szenario: ${report.tippingConflicts}. (n-1) ist stichprobenartig geprüft: 16 Ausfälle im Detail, und die Mengen der verletzten Elemente stimmen in allen 34 Blöcken überein. Ein Grenzfall: Schwachlast, Ausfall Leitung 77 mit Trennstelle 239, liegt in u_max bei 1,0549996 p.u. und damit 3,7·10⁻⁷ unter der Grenze 1,055. Mit dem π-Modell wären es 1,0550003 p.u. und 21 statt 20 verletzte Ausfälle. Das Ergebnis hängt dort am siebten Dezimalwert.`,
          `A second solver builds the admittance matrix itself and solves with its own Newton-Raphson. It checks normal operation and tipping points. It uses only the tables from pandapower, not the solver, and models the transformer as a pi section. This run checked ${report.states} normal-operation states. The largest difference is ${small(report.duPu, language)} p.u. in voltage, ${small(report.dLinePct, language)} percentage points in line loading, ${small(report.dTrafoPct, language)} percentage points in the transformer and ${small(report.dPMw, language)} MW in the import. The checker’s energy balance is at most ${small(report.balanceNrMw, language)} MW, and the rounded file’s balance at most ${small(report.balanceJsonMw, language)} MW. Conflicts between tipping point and scenario: ${report.tippingConflicts}. (n-1) was spot-checked: 16 outages in detail, and the sets of violated elements match in all 34 blocks. One edge: low load, outage of line 77 with tie switch 239, has u_max at 1.0549996 p.u., which is 3.7·10⁻⁷ below the limit 1.055. With the pi model it would be 1.0550003 p.u. and 21 violated outages instead of 20. There the result hangs on the seventh decimal place.`
        )}
      </p>
      <h3>{tx("Was ein Profi fragt", "What a specialist asks")}</h3>
      <aside className="methodik-ask">
        <p>
          {tx(
            "Warum ist der Stufensteller fest? Die Stufe wird einmal so gewählt, dass die Sammelschiene dem Sollwert am nächsten liegt. Ein Regler, der die Stufe im Betrieb nachführt, ist nicht eingebaut. Das steht auf der Seite.",
            "Why is the tap fixed? The step is chosen once so that the busbar is closest to the setpoint. A controller that moves the tap during operation is not included. The page says so."
          )}
        </p>
        <p>
          {tx(
            "Warum kein Kurzschluss? Im Testnetz fehlen die Kurzschlussleistung des vorgelagerten Netzes, die Faktoren der Einspeiser und die Nullsystemdaten. Eine Zahl hinge an diesen Annahmen. Darum wird kein Kurzschlussstrom angegeben.",
            "Why no short circuit? The test grid lacks the short-circuit power of the upstream grid, the infeed factors and the zero-sequence data. A figure would depend on those assumptions. That is why no short-circuit current is given."
          )}
        </p>
        <p>
          {tx(
            "Warum bricht der ferne Knoten bei 20 MW Laden ab? Der Lastfluss findet dort keinen Betriebspunkt, weder mit pandapower noch mit dem zweiten Rechner. Das zählt als Grenzverletzung. Es wird kein Ersatzwert gezeigt.",
            "Why does the far node stop at 20 MW charging? The load flow finds no operating point there, neither with pandapower nor with the second solver. That counts as a limit violation. No substitute figure is shown."
          )}
        </p>
        <p>
          {tx(
            "Warum ist (n-1) schon ohne Speicher verletzt? Weil das Lehrnetz Stichleitungen ohne Rückfall und im Starklastfall hoch belastete Kabel hat. Die Seite vergleicht deshalb mit und ohne Speicher, statt ein Bestehen zu melden.",
            "Why does (n-1) fail even without storage? Because the teaching grid has spurs without an alternative path and, at peak load, heavily loaded cables. The page therefore compares with and without storage, instead of reporting a pass."
          )}
        </p>
        <p>
          {tx(
            "Gilt das für mein Netz? Nein. Es ist ein Lehrnetz. Die Rechnung sagt nichts über ein reales Netz und nichts über einen Netzbetreiber.",
            "Does this apply to my grid? No. It is a teaching grid. The calculation says nothing about a real grid and nothing about a network operator."
          )}
        </p>
      </aside>
      <h3>{tx("Nicht gerechnet", "Not calculated")}</h3>
      <p>
        {tx(
          "Nicht gerechnet: Kurzschluss, Spannungsqualität, Zeitreihen, Blindleistungsregelung, Wirkungsgrad, Ladezustand, mehrere Speicher, Optimierung. Das Ergebnis ist kein Bescheid und keine Zusage.",
          "Not calculated: short circuit, voltage quality, time series, reactive-power control, efficiency, state of charge, several storage units, optimisation. The result is not a decision and not a commitment."
        )}
      </p>
      <h3>{tx("Quellen und Lizenz", "Sources and licence")}</h3>
      <ul>
        <li>
          <a href="https://doi.org/10.3390/en13123290">Meinecke et al., SimBench, Energies 13(12), 3290, 2020</a>
          {tx(". Open Access, CC BY, MDPI. Abruf 28.10.2026.", ". Open access, CC BY, MDPI. Retrieved 28 October 2026.")}
        </li>
        <li>
          <a href="https://doi.org/10.1109/TPWRS.2018.2829021">Thurner et al., pandapower, IEEE Trans. Power Systems 33(6), 2018</a>
          {tx(". Abruf 28.10.2026. Das Programm steht unter BSD-3-Clause, Universität Kassel, Fraunhofer IEE und Mitwirkende.", ". Retrieved 28 October 2026. The program is BSD-3-Clause, University of Kassel, Fraunhofer IEE and contributors.")}
        </li>
        <li>
          <a href="https://doi.org/10.34890/752">Meinecke et al., CIRED 2019, Paper 0139</a>
          {tx(". Studienfälle und Spannungsband. Abruf 28.10.2026.", ". Study cases and voltage band. Retrieved 28 October 2026.")}
        </li>
        <li>
          <a href="https://simbench.de">SimBench-Datenbank</a>
          {tx(
            ", Open Database License (ODbL) 1.0. Die Einzelinhalte stehen laut LICENSE zusätzlich unter der Database Contents License (DbCL) 1.0. Namensnennung: Universität Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE. Das Python-Paket simbench steht unter BSD-3-Clause.",
            ", Open Database License (ODbL) 1.0. The individual contents are also under the Database Contents License (DbCL) 1.0, according to the LICENSE file. Attribution: University of Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE. The Python package simbench is BSD-3-Clause."
          )}
        </li>
      </ul>
      <p>
        {tx(
          "Enthält Informationen aus der SimBench-Datenbank, die unter der Open Database License (ODbL) bereitgestellt wird. Ob die Ergebnisdatei eine abgeleitete Datenbank ist, ist nicht abschließend belegt. Darum bietet die Seite die Datei nicht zum Herunterladen an. Sie wird nur von der Seite geladen. Das Erzeugungsskript und der Nachrechner liegen im Repository; das ist der Algorithmus, mit dem die Zahlen entstanden sind.",
          "Contains information from the SimBench database, which is made available under the Open Database License (ODbL). Whether the result file is a derivative database is not conclusively established. The page therefore does not offer the file for download. The page only loads it. The generation script and the checker are in the repository; that is the algorithm that produced the figures."
        )}
      </p>
      <p>
        {tx(
          "Das CIGRE-Mittelspannungsnetz aus pandapower wird nicht verwendet, weil die Nutzungsrechte der Netzdaten nicht belegt sind.",
          "The CIGRE medium-voltage grid shipped with pandapower is not used, because the usage rights of that grid data are not established."
        )}
      </p>
      <p>
        <a href="/netz">{tx("Zur Seite Netzwirkung im Testnetz", "To the test-grid page")}</a>
      </p>
    </section>
  );
}
