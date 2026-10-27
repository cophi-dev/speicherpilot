import type { AppLanguage } from "@/components/language-context";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";

export function SzenarienMethodik({ language }: { language: AppLanguage }) {
  const tx = (de: string, en: string) => (language === "de" ? de : en);
  const eta = Math.sqrt(ROUND_TRIP_EFFICIENCY);
  return (
    <section id="szenarien">
      <h2>{tx("09 Szenarien", "09 Scenarios")}</h2>
      <p>
        {tx(
          "Der Rechner auf /szenarien vergleicht drei Wege für denselben Speicher am selben Netzknoten: Anschluss voll, flexible Anschlussvereinbarung, verzögerter Anschluss. Die Hauptzahlen sind Prozent und Monate. Euro steht nur im Aufklappblock, als Modellschätzung und obere Modellgrenze.",
          "The calculator on /szenarien compares three paths for the same battery at the same grid node: full connection, flexible connection agreement, delayed connection. The main figures are percent and months. Euro appears only in the expandable block, as a model estimate and upper model bound."
        )}
      </p>
      <p>
        {tx(
          "Die Tageswerte kommen aus einem kleinen linearen Programm mit perfekter Preisvorschau und mehreren Zyklen. Es ist nicht der vorsichtige Kern der Beispieltage. Am Beispielspeicher 103,5 MW / 238,5 MWh und in den letzten 12 Monaten bis 26.10.2026 liegt die Jahressumme des Optimierers bei 9.712.347 €, Modellschätzung, die des Kerns bei 3.778.603 €, Modellschätzung. Faktor 2,57. Darum stehen auf der Seite keine Euro-Hauptzahlen.",
          "The daily values come from a small linear programme with perfect foresight and several cycles. It is not the cautious core of the example days. For the example battery of 103.5 MW / 238.5 MWh and the last 12 months to 26 October 2026, the optimiser’s year is €9,712,347, a model estimate, and the core’s year is €3,778,603, a model estimate. Factor 2.57. That is why the page has no euro headline figures."
        )}
      </p>
      <div className="methodik-table">
        <table>
          <thead>
            <tr>
              <th>{tx("Größe", "Quantity")}</th>
              <th>{tx("Formel", "Formula")}</th>
              <th>{tx("Einheit", "Unit")}</th>
              <th>{tx("Quelle", "Source")}</th>
              <th>{tx("Unsicherheit", "Uncertainty")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{tx("Tageserlös", "Daily revenue")}</td>
              <td>R = Σ p · (d − c) · Δt</td>
              <td>€</td>
              <td>{tx("Energy-Charts DE-LU, Bundesnetzagentur | SMARD.de, CC BY 4.0, Abruf 27.10.2026", "Energy-Charts DE-LU, Bundesnetzagentur | SMARD.de, CC BY 4.0, retrieved 27 Oct 2026")}</td>
              <td>{tx("Preisnehmer, perfekte Vorschau, nur Day-Ahead", "Price taker, perfect foresight, day-ahead only")}</td>
            </tr>
            <tr>
              <td>{tx("Ladezustand", "State of charge")}</td>
              <td>s neu = s alt + η·c·Δt − d·Δt/η</td>
              <td>MWh</td>
              <td>{tx(`dieselbe Richtung wie der Kern, Round-Trip ${ROUND_TRIP_EFFICIENCY}, η = √ davon ≈ ${eta.toFixed(4)}`, `same direction as the core, round trip ${ROUND_TRIP_EFFICIENCY}, η = its square root ≈ ${eta.toFixed(4)}`)}</td>
              <td>{tx("fester Wirkungsgrad, Spanne 80–90 %", "fixed efficiency, span 80–90%")}</td>
            </tr>
            <tr>
              <td>{tx("Grenze", "Limit")}</td>
              <td>0 ≤ c, d ≤ G</td>
              <td>MW</td>
              <td>{tx("Annahme. Rechtsrahmen § 17 Abs. 2b EnWG, statisch oder dynamisch. Abruf 27.10.2026", "Assumption. Legal frame section 17 (2b) EnWG, static or dynamic. Retrieved 27 Oct 2026")}</td>
              <td>{tx("G ist keine Netzberechnung", "G is not a grid calculation")}</td>
            </tr>
            <tr>
              <td>{tx("Normierung", "Normalisation")}</td>
              <td>r = R / P, h = E / P, g = G / P</td>
              <td>€/MW</td>
              <td>{tx("Homogenität des linearen Programms", "Homogeneity of the linear programme")}</td>
              <td>{tx("exakt im Modell", "exact in the model")}</td>
            </tr>
            <tr>
              <td>{tx("Interpolation", "Interpolation")}</td>
              <td>{tx("bilinear in h und g", "bilinear in h and g")}</td>
              <td>—</td>
              <td>{tx("Tabelle im Repo", "table in the repo")}</td>
              <td>{tx("Am Punkt h = 2,304 und g = 0,37 gemessen −0,44 %. Über die geprüften Punkte liegen die Prozentwerte bis 0,2 Prozentpunkte daneben, der Euro-Absolutwert bis etwa 1,1 %. Die Sehne liegt unter dem direkten Wert.", "At h = 2.304 and g = 0.37 the measured gap is −0.44%. Across the checked points the percent figures are off by up to 0.2 percentage points, and the absolute euro figure by about 1.1%. The chord sits under the direct value.")}</td>
            </tr>
            <tr>
              <td>{tx("Monatserlös", "Monthly revenue")}</td>
              <td>M = P · Σ r</td>
              <td>€</td>
              <td>{tx("Preisreihe", "price series")}</td>
              <td>{tx("typisches Jahr, kein Prognosewert", "a typical year, not a forecast")}</td>
            </tr>
            <tr>
              <td>{tx("Kumulierter Erlös", "Cumulative revenue")}</td>
              <td>K(t) = Σ M</td>
              <td>€</td>
              <td>—</td>
              <td>{tx("die Saison wiederholt sich", "the season repeats")}</td>
            </tr>
            <tr>
              <td>{tx("Erlösverlust", "Revenue loss")}</td>
              <td>1 − K(B, 12) / K(A, 12)</td>
              <td>%</td>
              <td>—</td>
              <td>{tx("ohne die fehlenden Posten unten", "without the missing items below")}</td>
            </tr>
            <tr>
              <td>{tx("Kosten der Verzögerung", "Cost of delay")}</td>
              <td>K(A, V)</td>
              <td>{tx("€ oder % eines Jahres", "€ or % of one year")}</td>
              <td>—</td>
              <td>{tx("V ist eine Annahme", "V is an assumption")}</td>
            </tr>
            <tr>
              <td>{tx("Gleichstand", "Crossover")}</td>
              <td>{tx("erster Monat, in dem C mindestens B erreicht", "first month in which C reaches at least B")}</td>
              <td>{tx("Monat", "month")}</td>
              <td>—</td>
              <td>{tx("ohne Kosten, ohne Zeitwert", "no cost, no time value")}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        {tx(
          "Beispiel aus diesem Modell, letzte 12 Monate, h ≈ 2,3, Grenze fest: bei 50 % der Leistung bleiben rund 80 % des Erlöses, bei 25 % rund 56 %, bei 10 % rund 25 %. Nur im Abendfenster 17–21 Uhr bleiben bei 50 % rund 94 %, bei 0 MW im Abendfenster rund 83 %. Nur im Mittagsfenster 10–16 Uhr bleiben bei 50 % rund 95 %, bei 0 MW im Mittagsfenster rund 69 %. Das sind Ergebnisse dieses Modells, keine Aussage über reale Anschlüsse.",
          "An example from this model, the last 12 months, h ≈ 2.3, fixed limit: at 50% of power about 80% of revenue remains, at 25% about 56%, at 10% about 25%. In the evening window 17:00–21:00 only, about 94% remains at 50%, and about 83% at 0 MW in that window. In the midday window 10:00–16:00 only, about 95% remains at 50%, and about 69% at 0 MW in that window. These are results of this model, not a statement about real connections."
        )}
      </p>
      <p>
        {tx(
          "Die Monate wiegen ungleich. Im vollen Anschluss trägt der November rund 5 %, der Dezember rund 3 %, der März bis Juni je rund 11 %, der September rund 13 %. Darum verschiebt der Startmonat die Kosten des Wartens. Eine Verzögerung von vier Monaten November bis Februar kostet im Modell rund 15 % eines Jahres, März bis Juni rund 44 %.",
          "The months do not weigh the same. Under a full connection November is about 5%, December about 3%, March to June about 11% each, September about 13%. That is why the start month moves the cost of waiting. A delay of four months from November to February costs about 15% of a model year, March to June about 44%."
        )}
      </p>
      <h3>{tx("Was ein Profi fragt", "What a professional asks")}</h3>
      <aside className="methodik-ask">
        <p>
          {tx(
            "„Woher kommt Ihre Grenze? Aus einer Netzberechnung am Knoten, mit (n−1) und Auslastung, oder ist sie angenommen?“ Antwort: angenommen. Der Rechner übernimmt sie als Eingabe.",
            "“Where does your limit come from? From a grid calculation at the node, with (n−1) and loading, or is it assumed?” Answer: assumed. The calculator takes it as an input."
          )}
        </p>
        <p>
          {tx(
            "„Und was sparen Sie beim Baukostenzuschuss oder Leistungspreis, wenn Sie kleiner anschließen?“ Antwort: nicht gerechnet. Nach der Pressemitteilung des Bundesgerichtshofs 129/2025 zum Beschluss EnVR 1/24 vom 15.07.2025 wird der Anschluss umso teurer, je höher der Leistungsbedarf ist. Ob eine Grenze den Betrag senkt, sagt die Pressemitteilung nicht.",
            "“And what do you save on the construction-cost contribution or the demand charge if you connect smaller?” Answer: not calculated. The Federal Court of Justice press release 129/2025 on the decision EnVR 1/24 of 15 July 2025 says the connection gets more expensive the higher the power demand is. The press release does not say whether a limit lowers the amount."
          )}
        </p>
        <p>
          {tx(
            "„Wie wird die Grenze gemessen und durchgesetzt, und was passiert bei Überschreitung?“ Antwort: nicht gerechnet. § 17 Abs. 2b Satz 3 Nr. 4 und 5 EnWG verlangt Regeln zur Technik und zur Haftung. Abruf 27.10.2026.",
            "“How is the limit measured and enforced, and what happens if it is exceeded?” Answer: not calculated. Section 17 (2b) sentence 3 items 4 and 5 EnWG require rules on technology and liability. Retrieved 27 Oct 2026."
          )}
        </p>
      </aside>
      <h3>{tx("Quellen, Stand 27.10.2026", "Sources, as of 27 October 2026")}</h3>
      <ul>
        <li>
          <a href="https://www.gesetze-im-internet.de/enwg_2005/__17.html">§ 17 EnWG</a>
          {tx(
            ", Abs. 2b: eine flexible Netzanschlussvereinbarung kann eine statische oder dynamische Begrenzung verlangen. Abruf 27.10.2026. Die Einzelnorm nennt keinen Fassungsstand.",
            ", subsection 2b: a flexible grid connection agreement can require a static or dynamic limit. Retrieved 27 October 2026. The single-section page states no consolidation date."
          )}
        </li>
        <li>
          <a href="https://www.bundesnetzagentur.de/1107474">{tx("Bundesnetzagentur, Pressemitteilung 27.05.2026", "Bundesnetzagentur, press release 27 May 2026")}</a>
          {tx(
            ". Vorläufiger Zwischenstand zu AgNes, keine Regelung. Abruf 27.10.2026.",
            ". Preliminary interim status of AgNes, not a rule. Retrieved 27 October 2026."
          )}
        </li>
        <li>
          <a href="https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260806_Agnes.html">{tx("Bundesnetzagentur, Pressemitteilung 06.08.2026", "Bundesnetzagentur, press release 6 August 2026")}</a>
          {tx(
            ". Konsultation des Festlegungsentwurfs bis 18.09.2026, Erlass für Ende 2026 geplant. Inhalte des Entwurfs werden hier nicht dargestellt; Stand 27.10.2026. Kein Tenor, kein Preis, kein Stichtag.",
            ". Consultation on the draft determination until 18 September 2026, adoption planned for the end of 2026. The contents of the draft are not set out here; as of 27 October 2026. No operative part, no price, no cutoff date."
          )}
        </li>
        <li>
          <a href="https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html">BGH, PM 129/2025</a>
          {tx(", Beschluss vom 15.07.2025, EnVR 1/24. Abruf 27.10.2026.", ", decision of 15 July 2025, EnVR 1/24. Retrieved 27 October 2026.")}
        </li>
        <li>
          <a href="https://api.energy-charts.info/v2/price?bzn=DE-LU">Energy-Charts / SMARD</a>
          {tx(", Day-Ahead DE-LU, CC BY 4.0, Abruf 27.10.2026.", ", day-ahead DE-LU, CC BY 4.0, retrieved 27 October 2026.")}
        </li>
      </ul>
    </section>
  );
}
