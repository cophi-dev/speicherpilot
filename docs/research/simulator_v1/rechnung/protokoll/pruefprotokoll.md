# Prüfprotokoll der Entwurfsgraphen · Simulator-Rechnung v1

Skill `data-visual-engineering-check`. Jede sichtbare Linie, Fläche, Zahl und Beschriftung stammt per Skript (`viz_simulator.py`) aus den CSV/JSON dieser Rechnung. Keine händisch gesetzten Werte.

Stand 12.11.2026, 10:50 Europe/Berlin. Graphen in `graphs/`.

---

## G1 · Pareto-Front (`g1_pareto_1280.png`, `g1_pareto_390.png`)

| Element | Datenspalte / Zahl | Quelle |
|---|---|---|
| Markt-Punkt, 34,09 Mio. €, 0,37 GW | `revenue_mio_eur` = 34,089906, `reduction_gw` = 0,365907 | `pareto_punkte.csv`, `source=market_lex`, factor 2; unabhängig nachgerechnet aus `dispatch/x2_price_lex.csv` (Σ price·(d−c)·0,25 h = 34 089 905,54 €, Spitze 64 039,9929 MW) |
| Netzdienlich-Punkt, 33,79 Mio. €, 3,59 GW | 33,786267 Mio. €, 3,590313 GW | `source=netz_lex`; `dispatch/x2_peak_lex.csv` (33 786 266,79 €, Spitze 60 815,5874 MW) |
| ε-Schnitt 70 %, 33,97 Mio. € (99,6 %), 2,51 GW | 33,966690 / 34,089906 = 99,6386 %; 2,513169 GW = 70,00 % von 3,590313 | `source=eps70`; `dispatch/x2_eps70.csv` |
| ε-50 % / ε-90 % (in der Frontlinie, nicht extra beschriftet) | 34,029705 Mio. / 1,795106 GW bzw. 33,862089 Mio. / 3,231231 GW | `source=eps50`, `eps90` |
| λ-Raster, 15 graue Punkte | `source=lam_grid`, λ von 0,298 bis 29 779 €/MW um λ_mid = 94,17 €/MW | `pareto_punkte.csv`; mehrere Punkte fallen auf die Endpunkte (erwartet) |
| Dichotomie-Extrempunkte, bilden die Linie | 13 Punkte, `source=dichotomy` | `pareto_punkte.csv` / `pareto_voll.json` |
| fNAV-Kreis, „landet am Markt-Ende“ | 33,996152 Mio. €, 0,365907 GW, identische Senkung zum Markt | `source=fnav_lex`; `dispatch/x2_fnav_price_lex.csv` |
| Offenes Quadrat „Deckel 62 GW“, 33,98 Mio. €, 2,41 GW | 33,977986 Mio. €, Senkung 2,4059 GW, Spitze exakt 62 000 MW | `fnavB.json` Schlüssel `2_cap62`; `dispatch/x2_fnavB_cap62.csv` |
| 70/70-Feld und gestrichelte Linien | x = 0,70 · 34,089906 = 23,86 Mio. €; y = 0,70 · 3,590313 = 2,513 GW | berechnet in `viz_simulator.py` aus den Endpunkten, nicht gesetzt |
| Doppelpfeil „volle Senkung kostet 0,30 Mio. € (0,89 %)“ | (34 089 905,54 − 33 786 266,79) = 303 638,75 €; 303 638,75 / 34 089 905,54 = 0,8907 % | Differenz der beiden lex-Endpunkte |
| Titel „70 % der Monatssenkung kosten 0,36 % des Erlöses“ | (34 089 905,54 − 33 966 690,42) / 34 089 905,54 = 0,3614 % | ε-Schnitt gegen Markt |
| x-Achse links 0–36, rechts 33,70–34,18; y 0–4,2 bzw. 0–4,05 GW | bewusste volle Skala (nicht irreführend abgeschnitten) plus Zoom | fest im Skript, Grenzen so dass alle Punkte sichtbar sind |
| Untertitel Flotte 4,64 GW / 8,15 GWh | 4 644,09022 MW / 8 152,4588 MWh, gerundet | `meta.json`, battery-charts 31.10.2026 |

**Modellartefakte:** Endpunkte lexikographisch (im Fuß genannt). Lex-Peak um 0,05 MW über dem Roh-Minimum (Toleranz), unsichtbar bei zwei Dezimalen.

**Expertenblick:** Ein Entwickler könnte die Zoom-Achse (33,7–34,2) für die ganze Wahrheit halten — deshalb steht die volle Skala links daneben. Ein Netzplaner sieht, dass der Markt-Punkt *unter* der 70-%-Senkungslinie liegt (nur 0,37 von 3,59 GW): der Markt allein erfüllt H3 nicht, der ε-Schnitt tut es.

---

## G2 · Tagesklassen (`g2_tagesklassen_1280.png`, `g2_tagesklassen_390.png`)

| Element | Datenspalte / Zahl | Quelle |
|---|---|---|
| 31 Balken, Höhe = ΔM/ΔN | `share_of_netz_reduction` | `tagesklassen_oktober.csv`, Tageshorizont, ×2 |
| Farbe je Klasse | `klasse` ∈ {win_win, neutral, konflikt_schwach, konflikt_hebung} | dieselbe Datei, Regel T in `solve_simulator.py:classify_day` |
| Zählung 0 / 18 / 11 / 2 | `collections.Counter` über `klasse` | 0 Win-win, 18 neutral, 11 Konflikt-schwach, 2 Konflikt-Hebung |
| Grüne Linie 70 %, orange punktiert 30 % | festgelegte Schwellen `WINWIN_SENKUNG_ANTEIL=0,70`, `KONFLIKT_SENKUNG_ANTEIL=0,30` | Skript, vor dem Lauf festgelegt |
| Beschriftung 06.10. „bester Tag, 46 %“ | 1,772 / 3,864 = 0,4586 | Zeile `2026-10-06` |
| 03.10. „41 %“ | 1,523 / 3,725 = 0,4089 | Zeile `2026-10-03` |
| 21.10. „hebt um 1,31 GW“ | `market_reduction_gw` = −1,309, Klasse `konflikt_hebung` | Zeile `2026-10-21`; Tagesfahrplan `dispatch/daily/2026-10-21_price.csv`, R′max 55 604,6 MW um 14:00 |
| 25.10. „hebt um 0,63 GW“ | −0,629 GW | Zeile `2026-10-25` |
| 29.10. „Monatsspitze, 10 %, 2,11 Mio. €“ | 0,366 / 3,590 = 0,102; `market_revenue_eur` = 2 113 024 | Zeile `2026-10-29`; beobachtete Spitze 64 405,9 MW um 18:15 ist die Monatsspitze |
| Achse „Oktobertag 2026 (Europe/Berlin)“, Labels 01.–31. | `date` | CSV |
| Fuß „Maximum 46 %, 29.10. nur 10 %“ | siehe oben | — |

**Modellartefakte:** Tageshorizont mit SoC-Rückkehr 50/50, daher weichen Tageserlös-Summe (32,26 Mio. €) und Monats-Markt (34,09) voneinander ab; das steht in `ergebnis.md`, nicht als Fehler im Graph. Die Monatsscheibe (`tagesklassen_monatsscheibe.csv`) ist bewusst *nicht* die Farbgrundlage.

**Expertenblick:** Ein Entwickler sieht 0 grüne Balken und könnte die Schwelle lockern wollen — die 70 % sind vorab festgelegt und bleiben es. Ein Netzplaner sieht, dass der 29.10. (Monatsspitze) orange ist, nicht grün: der netzkritischste Tag ist ein Konflikt.

---

## G3 · Beispieltage 21.10. und 29.10. (`g3_tage_1280.png`, `g3_tage_390.png`)

| Element | Datenspalte / Zahl | Quelle |
|---|---|---|
| Graue Linie „beobachtet“ | `residual_mw` / 1000 | `dispatch/daily/2026-10-21_price.csv` und `…/2026-10-29_price.csv` (R ist in price- und peak-Datei identisch) |
| Rost-Linie „nach Markt-Fahrplan“ | `residual_prime_mw` der price-Datei | dieselben Dateien |
| Petrol-Linie „nach netzdienlichem Fahrplan“ | `residual_prime_mw` der peak-Datei | `dispatch/daily/2026-10-21_peak.csv`, `…/2026-10-29_peak.csv` |
| Gestrichelte Indigo-Linie „Kompromiss 70 %“ | `residual_prime_mw` der eps70-Datei | `dispatch/daily/2026-10-21_eps70.csv` (Spitze 52,466 GW, Senkung 1,829 GW = 70 % von 2,613), `…/2026-10-29_eps70.csv` (61,893 GW, 2,513 GW = 70 % von 3,590) |
| Ocker-Fläche (lädt) / Petrol-Fläche (entlädt) an der Restlast | max(0, R′−R) bzw. max(0, R−R′) des *Markt*-Fahrplans | berechnet in `_fill_laden_entladen` aus denselben Spalten |
| Mittlere Spur „Fahrplan, GW“, + entlädt / − lädt | (d − c)/1000, `step where=post` | Spalten `d_mw`, `c_mw` von Markt (rost) und Netz (petrol) |
| Lila Spur „€/MWh“ | `day_ahead_eur_mwh` | dieselben Dateien |
| Graues Band 23–24 Uhr, „SoC-Rückkehr (Modell)“ | festes Fenster 23:00–24:00 | SoC-Ende = 50 % erzwingt Nachladen; in den CSV sichtbar (z. B. 21.10. Markt: 23:15–23:45 Laden mit 4 644 MW, SoC 865 → 3 006 MWh, Ziel 4 076) |
| 21.10. „Markt lädt 4,64 GW, neue Tagesspitze 55,60 GW 14:00“ | c = 4 644,09 MW, R′ = 55 604,6 MW um 14:00, beobachtet 50 960,5 + 4 644,1 | `2026-10-21_price.csv` |
| 21.10. „beobachtet 54,30 GW 18:30“ | Rmax = 54 295,2 MW um 18:30 | dieselbe Datei |
| 21.10. „Netzdienlich 51,68 GW (−2,61 GW)“ | R′max = 51 682,3 MW, Senkung 2,6129 GW | `2026-10-21_peak.csv` (R′max um 07:45: nach dem Kappen liegt die Tagesspitze am Morgen) |
| 29.10. „Restlastspitze 64,41 GW 18:15, Markt entlädt nur noch 0,83 GW“ | R = 64 405,9 MW, d = 831,3 MW um 18:15 | `2026-10-29_price.csv` (und Monatsfahrplan `dispatch/x2_price_lex.csv`, gleiche Viertelstunde) |
| 29.10. „Netzdienlich hält auf 60,82 GW (16:45–19:00)“ | R′ = 60 815,6 MW über dieses Fenster | `2026-10-29_peak.csv` |
| 29.10. „Markt entlädt voll 17:00–18:00“ | d = 4 644,09 MW in 17:00, 17:15, 17:30, 17:45 | `2026-10-29_price.csv` |
| 29.10. „Preismax. 574 €/MWh 17:15“ | 574,28 €/MWh | `day_ahead_eur_mwh`, Zeile 17:15; bestätigt `definitionen-und-ergebnisse.json` `price_max` |
| Zeitzone 21.10. MESZ UTC+2, 29.10. MEZ UTC+1 | Offsets in `timestamp_berlin` | Zeitumstellung 25.10. |
| Achse 00–24 Uhr, Viertelstunden | 96 Intervalle je Tag (keine Zeitumstellung an diesen beiden Tagen) | Länge der Daily-CSV |

**Modellartefakte:** SoC-Rückkehr 23–24 Uhr schraffiert und beschriftet. Nachtladen gegen 00:45 an beiden Tagen ist *kein* Artefakt, sondern Laden zum niedrigen Preis bei Start-SoC 50 % (Raum nach oben); es erscheint in Markt und Netz ähnlich, weil beide lexikographisch Erlöse nutzen, wo die Tagesspitze nicht bindet.

**Expertenblick:** Ein Entwickler stutzt am 29.10., warum der Markt um 18:15 fast leer ist, obwohl die Spitze da liegt — der Preispeak war um 17:15, das ist die Antwort und steht an der Kurve. Ein Netzplaner stutzt, dass die gehobene Tagesspitze am 21.10. (55,60 GW) unter der Monatsspitze bleibt; der Fuß klärt, dass dasselbe Laden ab ×3,9 die Monatsspitze übersteigt.

---

## G4 · fNAV und Kipppunkt (`g4_fnav_kipppunkt_1280.png`, `g4_fnav_kipppunkt_390.png`)

| Element | Datenspalte / Zahl | Quelle |
|---|---|---|
| Drei normalisierte Fronten ×2, ×5, ×10 | x = `revenue_eur` / Markt-Erlös × 100, y = `reduction_mw` / Netz-Senkung × 100 | `pareto_punkte.csv` je `factor`, Endpunkte und ε-Punkte plus Dedup-Front |
| Raute = ε-Schnitt 70 % | ×2: 99,64 % Erlös, 70 % Senkung; ×5: 98,94 % / 70 %; ×10: 96,61 % / 70 % | `source=eps70` |
| 70/70-Feld ab 70/70 | fest | Skript |
| ×10-Markt-Punkt „außerhalb der Achse, −203 %“ | Marktsenkung −28,3510 GW / 13,9794 GW = −202,8 %; Spitze 92,7569 GW | `market_lex` factor 10; Achse bewusst bei −28 % begrenzt, Punkt beschriftet statt verschwiegen |
| ×5-Markt-Punkt, sichtbar unter 0 | −5,1305 / 9,4111 = −54,5 %, im Bild bei ×5 unter der Null, teilweise im sichtbaren Bereich bzw. beschriftet | `market_lex` factor 5, Spitze 69,5364 GW |
| Rechte Kurve, Monatsspitze unter Markt gegen ×k | `peak_gw`, `factor` | `kipppunkt.csv` (Faktoren 2, 2,5, 3, 3,5, 3,7, 3,8, 3,9, 4, 4,2, 4,5, 5) |
| Gestrichelte Referenz 64,41 GW | 64 405,9 MW | beobachtetes Monatsmaximum, `meta` / Eingangs-CSV, 29.10. 18:15 |
| „×3,8  64,04 GW, noch 29.10. 18:45“ | 64,0401 GW, `peak_ts=2026-10-29T18:45:00+01:00` | `kipppunkt.csv` |
| „×3,9  64,43 GW, neu 21.10. 14:00“ | 64,4284 GW, `peak_ts=2026-10-21T14:00:00+02:00` | dieselbe Datei |
| „×2  64,04 GW (Senkung 0,37 GW)“ | 64,0401, Senkung +0,3658 | dieselbe Datei, konsistent mit G1-Markt |
| Analytischer Kipppunkt k = 3,90 | Restlast 21.10. 14:00 = 50 960,5 MW; (64 405,9 − 50 960,5) / 4 644,09022 = 2,8952; k = 3,8952 | Eingangs-CSV plus Flottenbasis; 50 960,5 + 2,9 × 4 644,09 = 64 428,4 MW, gleich dem gelösten ×3,9 |
| Keine Euro an der rechten Achse und keine Euro für ×5/×10 links | Politik „Euro nur ×2“ | bewusst weggelassen; links nur Prozent |

**Modellartefakte:** Preisnehmer, Vollvoraussicht — in Titelzeile und Fuß. Die rechte Kurve ist flach bis ×3,8, weil bis dahin die Abendspitze des 29.10. (leicht gekappt) noch über dem Mittagsladen liegt; das ist Physik, kein Knick-Artefakt.

**Expertenblick:** Ein Entwickler sieht links H3 auch bei ×5/×10 und muss den Preisnehmer-Vorbehalt lesen (Fuß, Legende). Ein Netzplaner sieht rechts den Übergang 29.10. → 21.10. und versteht, warum ein Entnahmeverbot 16–21 Uhr den Kipppunkt nicht verhindert.

---

## Zahlenidentität Bild / Text / `ergebnis.md`

Kernzahlen in Titel, Untertitel, Annotationen und `ergebnis.md` sind auf zwei Dezimalen identisch (kaufmännisch, deutsches Komma):

- 34,09 / 33,79 / 33,97 Mio. €; 0,37 / 3,59 / 2,51 GW; 99,6 %; 0,36 %; 0,30 Mio. €; 0,89 %.
- 64,41 / 60,82 / 50,43 / 92,76 GW; Kipppunkt ×3,9; 55,60 / 54,30 / 51,68 GW am 21.10.; 574 €/MWh, 18:15, 0,83 GW am 29.10.
- 0 / 18 / 11 / 2 Tage; 46 %; 10 %; 1,31 GW; 2,11 Mio. €.

Zweiter Rechenweg: Erlös und Spitze aus den Dispatch-CSV (Summe bzw. Maximum) gleich den JSON-Werten, Differenz unter 1 € bzw. unter 0,001 GW.

---

## Optik (erst nach 1–7)

- Schrift Source Sans Pro, statisch (Variable Fonts fielen auf Gewicht 200 zurück und wurden verworfen).
- Farbcodierung durchgängig: Markt rost `#B4532A`, Netz petrol `#0F6E6B`, Kompromiss indigo `#3D4A9F`, Hebung rot `#B42318`, Konflikt-schwach orange `#C2410C`, Neutral grau, 70/70-Feld grün `#1B7F4E`. Farben neben der Linie beschriftet, nicht nur in der Legende.
- 1280-px-Fassungen und 390-px-Fassungen (vereinfachte Beschriftung, größere Schrift). 390-px prüft die Kernaussage in 5 Sekunden, nicht jede Annotation.
- Einheiten an jeder Achse, Europe/Berlin und Viertelstunden genannt, Modellschätzung an jedem Euro-Betrag.
