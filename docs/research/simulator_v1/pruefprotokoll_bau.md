# Prüfprotokoll Bau · Simulator Fahrweisen v1

Stand: 12.11.2026 · jede sichtbare Größe → Datenfeld → Quelle

| Element | Datenfeld | Quelle |
|---|---|---|
| Monatsfront Polylinie | `front[].revenueMioEur`, `reductionGw` | `data/.../simulator-fahrweisen.json` ← `pareto_punkte.csv` (`unique_front`) |
| Endpunkt Max. Erlös | `endpoints.marketLex` | `pareto_punkte.csv` `market_lex` |
| Endpunkt Netzdienlich | `endpoints.netzLex` | `pareto_punkte.csv` `netz_lex` |
| Kompromiss ε-70 (Default) | `endpoints.eps70`, `defaultIndex` | `pareto_punkte.csv` `eps70` |
| Schieber Index 0/8/17 | `namedIndices` | sortierte Front, benannte Punkte |
| Display 0,36 % | `(mkt−ε70)/mkt` | berechnet in UI aus Endpunkten |
| Volle Achse Zoomfenster | x 33,70–34,18 Mio. € | Spezifikation + `revenueMioEur` Endpunkte |
| 70-%-Feld | 0,7× Erlös / 0,7× max. Senkung | `viz_meta` / Endpunkte |
| Wertezeile | Ausgewählter `front[index]` | Slider-State |
| Tagesstreifen Balken | `tagesklassen[]` | `tagesklassen_oktober.csv` |
| Klassenfarben | `klasse` | Regel T in `solve_simulator.py` |
| Links 21.10. / 29.10. | feste Routen | Beispieltage `ergebnis.md` |
| fNAV Zeitfenster | `endpoints.fnavTimeWindow` | `fnav_lex` in `pareto_punkte.csv` |
| Deckel 62 GW | `endpoints.cap62Gw` | `fnavB.json` `2_cap62` |
| Deckel 64,41 GW | `endpoints.capBaselineGw` | `fnavB.json` `2` |
| Kipppunkt Kurve Markt | `kipppunkt.factors[]` | `kipppunkt.csv` + `pareto_punkte.csv` |
| Kipppunkt Hinweiszeile | `analyticalMw` 64 428 | `market-kipppunkt.json`, Methodik |
| Graph 1 (Hero) unverändert | `MonatV1Model` | `fleet-month-meta` Bundle |
| Fußnote Lex-Artefakt | `solverArtefactNote` | `ergebnis.md` |
