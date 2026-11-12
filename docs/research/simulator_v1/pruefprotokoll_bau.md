# Prüfprotokoll Bau · Simulator Fahrweisen v1

Stand: 12.11.2026 · jede sichtbare Größe → Datenfeld → Quelle

| Element | Datenfeld | Quelle |
|---|---|---|
| Monatsfront Polylinie | `front[].revenueMioEur`, `reductionGw` | `data/.../simulator-fahrweisen.json` ← `pareto_punkte.csv` (`unique_front`) |
| Endpunkt Max. Erlös | `endpoints.marketLex` | `pareto_punkte.csv` `market_lex` |
| Endpunkt Netzdienlich | `endpoints.netzLex` | `pareto_punkte.csv` `netz_lex` |
| Kompromiss ε-70 (Default) | `endpoints.eps70`, `defaultIndex` | `pareto_punkte.csv` `eps70` |
| Schieber Index 0/8/17 | `namedIndices` | sortierte Front, benannte Punkte |
| Display 0,36 % | `(mkt−ε70)/mkt` und `100 − ε70/mkt` | `fullReduction`/`compromisePct` in `lib/simulatorFahrweisenDerived.ts`; beide Wege 0,36 |
| Volle Achse Zoomfenster | x 33,70–34,18 Mio. € | Spezifikation, Endpunkte liegen darin |
| 70-%-Feld | 0,7× Markt-Erlös / ε-70-Senkung 2,51 GW | Endpunkte |
| Wertezeile | Ausgewählter `front[index]` | Slider-State |
| „0,30 von 34,09“ / volle Senkung 0,30 Mio. € | `marketLex − netzLex`, `toFixed(2)` | Endpunkte; 0,30363875 → 0,30; 34,0899 → 34,09 |
| „(0,89 %)“ neben der vollen Senkung | `(mkt−netz)/mkt`, ungerundet, dann `toFixed(2)` | 0,8907 % → 0,89 %. Zweiter Weg: 303 638,75 € / 34 089 905,54 € = 0,8907 %. Der Quotient der bereits gerundeten Anzeige 0,30/34,09 = 0,88 % ist ein Rundungsartefakt und wird nicht gezeigt. Bild, Text und `aria-label` verwenden denselben `pctLabel`. |
| Tagesstreifen Balken | `tagesklassen[]` | `tagesklassen_oktober.csv`, Regel T |
| Klassenfarben, Anzahlen 0/18/11/2 | `klasse`, `tagesklassenSummary` | Regel T in `solve_simulator.py` |
| 06.10. 46 % | `maxShare`, `maxShareDate` | `tagesklassen`, `Math.round(share×100)` |
| 03.10. 41 % (1280) | `shareOfNetzReduction` am 03.10. | dieselbe Tabelle |
| 21.10. hebt 1,31 GW | `marketReductionGw` (negativ) am 21.10. | `tagesklassen`; bestätigt durch `marketPeak − observed` aus Dispatch |
| 29.10. 10 % | `shareOfNetzReduction` am 29.10. | 0,102 → 10 % |
| 29.10. Tageserlös 2,11 Mio. € | `marketRevenueEur` / 1e6 | `tagesklassen`; bestätigt durch `(d−c)×Preis×0,25` im Markt-Dispatch |
| Links 21.10. / 29.10. | Routen fest, Zahlen aus `deriveExampleDay` | Beispieltage |
| Graph 3 Restlast beobachtet | `modes.price[].residualMw` | `dispatch/daily/{date}_price.csv` |
| Graph 3 Markt-Fahrplan | `modes.price[].residualPrimeMw`, `chargeMw`, `dischargeMw` | dasselbe |
| Graph 3 Netzdienlich / Kompromiss | `modes.peak` / `modes.eps70` | `dispatch/daily/{date}_{peak,eps70}.csv` |
| Graph 3 Preisspur | `priceEurMwh` | Day-Ahead in denselben Dispatch-Dateien |
| 21.10. neue Spitze 55,60 GW · 14:00 | `max(residualPrimeMw)` Markt | 55 604,6 MW um 14:00 |
| 21.10. lädt 4,64 GW | `chargeMw` am Markt-Spitzenintervall | 4 644,09 MW |
| 21.10. beobachtet 54,30 · 18:30 | `max(residualMw)` | 54 295,2 MW |
| 21.10. Netzdienlich 51,68 | `max(residualPrimeMw)` Peak-Fahrplan | 51 682,3 MW |
| 21.10. Kompromiss kostet 13 % (0,56 statt 0,65) | `dayRevenueEur` eps70 vs. price | 561 161 € / 648 195 €, `Math.round` 13 % |
| 29.10. 64,41 GW · 18:15 | `max(residualMw)` | 64 405,9 MW, Baseline `baselinePeakGw` |
| 29.10. Markt 0,83 GW übrig | `dischargeMw` des Markts um 18:15 | 831,37 MW |
| 29.10. Netzdienlich 60,82 | `max(residualPrimeMw)` Peak-Fahrplan | 60 815,6 MW; Plateau 16:45–19:00 |
| 29.10. 574 € · 17:15 | `max(priceEurMwh)` | 574,28 €/MWh |
| Achse Graph 3 | fest 20–70 GW, beide Tage | Spezifikation; 55,60 bleibt unter 64,41 sichtbar |
| Zeitzone / Auflösung | `timestamp_berlin` | Europe/Berlin, 15-min, in Figcaption |
| SoC-Band 23–24 Uhr | festes Fenster | Modellartefakt, schraffiert, Label in der Preisspur |
| fNAV Zeitfenster | `endpoints.fnavTimeWindow` | `fnav_lex` in `pareto_punkte.csv` |
| Deckel 62 GW | `endpoints.cap62Gw` | `fnavB.json` `2_cap62` |
| Deckel 64,41 GW | `endpoints.capBaselineGw` / `baselinePeakGw` | `fnavB.json` `2`, 64 405,9 MW |
| Kipppunkt Kurve Markt / Netz | `kipppunkt.factors[]` | `kipppunkt.csv` + `pareto_punkte.csv` |
| Markt ×10 92,76 / Netz ×10 50,43 | `factors[10]` | 92,7569 / 50,4265, `formatGw` |
| Neue Spitze ab ×3,9 · 64,43 GW | `factors[3.9].marketPeakGw` | 64,4284 GW, 21.10. 14:00 |
| Kipppunkt Hinweiszeile | `analyticalMw` 64 428 | `market-kipppunkt.json`, Methodik |
| Graph 1 (Hero der Monatssseite) unverändert | `MonatV1Model` | `fleet-month-meta` Bundle |
| Fußnote Lex-Artefakt | `solverArtefactNote` | `ergebnis.md` |
