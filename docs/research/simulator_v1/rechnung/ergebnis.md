# SpeicherPilot · Simulator-Rechnung v1 · Ergebnis

Stand 12.11.2026, 10:50 Europe/Berlin · nur gerechnet und dokumentiert, kein Repo-Code, kein PR · Daten und Skript in diesem Ordner · Löser HiGHS-LP (`scipy.optimize.linprog method='highs'`), Physik wie `MonthStorageMip` (Round-Trip 85 %, η = √0,85, SoC 10–90 %, Start = Ende = 50 %, Restlast′ = R + c − d, Preisnehmer, Vollvoraussicht, Day-Ahead DE-LU, Viertelstunden) · Zählung **(a)**: ×1 = 0 zusätzlich, ×k = (k−1) × 4,64409022 GW / 8,1524588 GWh (battery-charts Großspeicher, Monatswert 31.10.2026) · Euro nur für ×2, beschriftet **Modellschätzung**.

**Daten:** 2 980 Viertelstunden Oktober 2026 (25.10. hat 100 Intervalle, Zeitumstellung), Restlastspitze **64 405,9 MW** am 29.10. 18:15 MEZ, sha256 `f9d795a924cb80054a5ede5ecfa7d41f366869ec87d4d0559c7cf5769fbe60f4`. Quelle: Energy-Charts `total_power` und Day-Ahead DE-LU, dieselbe Datei wie der Repo-Oktoberlauf. Alle 120 Konsistenzchecks sind erfüllt (`checks.json`).

---

## Vier Kernantworten

### 1. 70 % der Monatssenkung kosten 0,36 % des Erlöses. H3 hält, deutlicher als erwartet.

*Graph: `graphs/g1_pareto_1280.png` (Zoom und volle Skala), mobil `g1_pareto_390.png`.*

Zusatzflotte ×2 (4,64 GW / 8,15 GWh), Oktober, lexikographische Endpunkte:

| Fahrweise | Erlös (Modellschätzung) | Monatsspitze | Senkung |
|---|---|---|---|
| Markt (max. Erlös, dann min. Spitze) | **34,09 Mio. €** | 64,04 GW | 0,37 GW |
| Netzdienlich (min. Spitze, dann max. Erlös) | **33,79 Mio. €** | 60,82 GW | **3,59 GW** |
| ε-Schnitt 70 % der max. Senkung | **33,97 Mio. €** (99,64 %) | 61,89 GW | **2,51 GW** |
| ε-Schnitt 90 % | 33,86 Mio. € (99,33 %) | 61,17 GW | 3,23 GW |

Die volle Senkung kostet **0,30 Mio. €**, das sind **0,89 %** des Markt-Erlöses (genau 303 639 €, bzw. 84 600 € je GW). Die Front klebt oben rechts, nicht an den Achsen. Ein sichtbares Knie gibt es: die Grenzkosten steigen von gut 5 000 €/GW am Markt-Ende auf rund 235 000 €/GW am letzten Stück zur vollen Senkung — aber selbst das letzte Stück bleibt, über den Monat, ein kleiner Betrag.

**H3 ist bestätigt:** Es gibt einen Punkt (den ε-Schnitt, und viele λ-Punkte in seiner Nähe), der ≥ 70 % der spitzenorientierten Monatssenkung bei ≥ 70 % des Markt-Erlöses erreicht. Tatsächlich sind es 70 % Senkung bei 99,6 % Erlös.

**Wichtiger Methodenfund:** Ohne Lexikographie liefert derselbe min-Peak-Löser für ×2 einen „Erlös“ von **−3,08 Mio. €**. Das ist ein Löser-Artefakt (der Löser minimiert nur die Spitze und hat keinen Grund, an anderen Stunden zu fahren). Der Satz aus `konzept_monat_v1`, die Spitze zu senken koste fast den ganzen Arbitrageerlös, stammt aus genau diesem Artefakt und **darf nicht übernommen werden**. Die Endpunkte der Front müssen lexikographisch sein: min. Spitze, *danach* max. Erlös.

Warum der Kompromiss so günstig ist: Die Monatsspitze sitzt in wenigen Abendstunden (im Oktober fünf Läufe über 60 GW, zusammen 9 Stunden). Sie zu kappen bindet nur diese Stunden. Der übrige Monat bleibt Arbitrage. Das ist kein Widerspruch zu Kernantwort 2.

### 2. An keinem Oktobertag erreicht der Markt 70 % der Tagesspitzen-Senkung. H1 hält mit der festgelegten Schwelle nicht.

*Graph: `graphs/g2_tagesklassen_1280.png`, mobil `g2_tagesklassen_390.png`.*

**Regel T** (vorab festgelegt, nach dem Lauf nicht angepasst, zitierbar für `/methodik`):

Zusatzflotte ×2, **Tageshorizont**, SoC Start = Ende = 50 %. Sei ΔM die Senkung der Tagesspitze unter dem Erlös-Fahrplan (`solve_price`), ΔN unter dem netzdienlichen Fahrplan (`solve_min_peak`, lex. max. Erlös). Toleranz 0,01 GW.

1. **Konflikt-Hebung**, wenn ΔM < −0,01 GW (der Erlös-Fahrplan *hebt* die Tagesspitze).
2. **Konflikt-schwach**, wenn ΔN ≥ 0,10 GW, ΔM < 0,30 · ΔN und der Markt-Tageserlös ≥ 50 % des höchsten Tageserlöses im Monat.
3. **Win-win**, wenn ΔN ≥ 0,10 GW und ΔM ≥ 0,70 · ΔN. (Der Erlös-Fahrplan erreicht per Konstruktion 100 % des maximalen Tageserlöses; die 70-%-Erlös-Schwelle von H1 ist nicht bindend.)
4. **Neutral**, sonst — einschließlich Tage mit wenig zu kappen und Tage, deren Marktsenkung zwischen 30 und 70 % liegt.

**Oktober, 31 Tage:** 0 Win-win, 18 neutral, 11 Konflikt-schwach, 2 Konflikt-Hebung.

- Höchster Anteil: **06.10. mit 46 %** (1,77 von 3,86 GW). Daneben 03.10. mit 41 %. Kein Tag erreicht 50 %, geschweige 70 %.
- **21.10.**: Markt hebt die Tagesspitze um **1,31 GW** (neue Spitze 55,60 GW um 14:00, beobachtet 54,30 GW um 18:30).
- **25.10.**: Hebung um 0,63 GW.
- **29.10.**, der Tag der Monatsspitze: Markt senkt nur **10 %** der netzdienlichen Senkung (0,37 von 3,59 GW), bei gleichzeitig **höchstem Tageserlös** (2,11 Mio. €, Spread 345 €/MWh). Das ist Konflikt-schwach — und der netzkritischste Tag des Monats.

Sensitivität, ohne die Regel zu ändern: Anteil ≥ 40 % an 2 Tagen, ≥ 30 % an 5 Tagen, ≥ 20 % an 9 Tagen. H1 bleibt widerlegt.

**Warum das die Monatsfront nicht widerlegt:** Die Monatsspitze ist *eine* Zahl, gebunden in wenigen Stunden. Die Tagesspitze gibt es jeden Abend. Wer jeden Abend kappen will, bindet viel mehr Energie, und der Markt benutzt sie für andere Spreads. Die Monatsscheibe des Monatsfahrplans als Klassengrundlage zu nehmen wäre falsch: der Monats-Netz-Fahrplan lässt Tage unterhalb der Monatsspitze unbehandelt, der Quotient ΔM/ΔN wird dort künstlich 1 und würde 17 falsche „Win-win“-Tage erzeugen.

**H2(a)** wird im Oktober ebenfalls gestützt: Der Tag mit dem höchsten Markt-Erlös (29.10.) ist nicht der mit der größten netzdienlichen Senkung (05.10., 07.10., 16.10.: je 4,64 GW, die volle Leistung).

### 3. Am 21.10. lädt der Markt mittags; am 29.10. liegen Preis- und Restlastspitze eine Stunde auseinander.

*Graph: `graphs/g3_tage_1280.png`, mobil `g3_tage_390.png` (21.10.). Beide Tage, Tageshorizont, mit Fahrplan-Spur und Lade-/Entladefläche.*

**21.10.** Der Markt lädt um 14:00 mit voller Leistung 4,64 GW (Preis 201,29 €/MWh) und erzeugt eine neue Tagesspitze von **55,60 GW**. Netzdienlich senkt die beobachtete Spitze (54,30 GW um 18:30) auf 51,68 GW (−2,61 GW). Der 70-%-Kompromiss liegt dazwischen (52,47 GW, −1,83 GW) und behält 0,56 von 0,65 Mio. € (87 % des Tageserlöses). An diesem einen Tag kostet der Kompromiss also deutlich mehr als im Monatsmaßstab — und genau das soll `/tag` zeigen. Die gehobene Tagesspitze von 55,60 GW liegt noch unter der Monatsspitze 64,41 GW; dasselbe Mittagsladen überschreitet sie ab ≈ ×3,9 (Kernantwort 4).

**29.10.** Das Preismaximum ist **574,28 €/MWh um 17:15**. Die Restlastspitze ist **64,41 GW um 18:15**, wenn der Preis schon auf 471 € gefallen ist. Der Markt entlädt von 17:00 bis 18:00 mit voller Leistung und hat um 18:15 nur noch 0,83 GW übrig (Senkung 0,37 GW). Netzdienlich hält von 16:45 bis 19:00 auf 60,82 GW (−3,59 GW). Das ist der mechanische Grund für den 10-%-Anteil in Kernantwort 2: der Markt folgt dem Preis, nicht der Restlast, und beide sind eine Stunde versetzt.

Graues Band 23–24 Uhr auf beiden Tagen: Nachladen auf SoC = 50 % zum Horizontende. **Modellartefakt, kein Netzeffekt.**

### 4. Ein abendliches Entnahmeverbot landet am Markt-Ende der Front. Die neue Monatsspitze beginnt bei ≈ ×3,9.

*Graph: `graphs/g4_fnav_kipppunkt_1280.png`, mobil `g4_fnav_kipppunkt_390.png`.*

**fNAV, stilisiert nach § 17 Abs. 2b EnWG, Variante Zeitfenster:** Entnahmeverbot (Laden = 0) täglich 16:00–21:00 Europe/Berlin, Einspeisung unbeschränkt, danach max. Erlös lex. min. Spitze. National, kein örtlicher Anschlussvertrag. Ergebnis für ×2: Erlös 34,00 Mio. € (99,7 %), Senkung **0,37 GW — identisch mit dem Markt**. Das Fenster verhindert das Mittagsladen am 21.10. 14:00 nicht (liegt außerhalb), und es erzwingt kein Entladen in die Abendspitze. Bei ×5 und ×10 bleibt die neue Spitze um 14:00 bestehen.

**Wirksame Vertragsform** ist ein Leistungsdeckel auf die Restlast nach Speicher — das ist derselbe ε-Schnitt, den der λ-Schieber schon erzeugt. Ein Deckel von 62 GW liefert bei ×2 2,41 GW Senkung bei 33,98 Mio. € (99,7 %). „Keine neue Monatsspitze“ (Deckel 64,41 GW) ändert bei ×2 nichts (der Markt bleibt darunter) und begrenzt bei ×5/×10 die neue Spitze auf die beobachteten 64,41 GW, ohne selbst zu senken.

**Kipppunkt (H2(b), Preisnehmer):** Unter dem Markt-Fahrplan bleibt die Monatsspitze bis ×3,8 bei 64,04 GW am 29.10. 18:45. Ab **×3,9** wandert sie auf den 21.10. 14:00 und liegt bei 64,43 GW, also über den beobachteten 64,41 GW. Analytisch: Restlast 21.10. 14:00 = 50,96 GW plus Voll-Laden, (k−1) = (64,41 − 50,96) / 4,644 = 2,90, **k = 3,90**. Das bestätigt die PR-#99-Angabe ≈ ×3,9. Ohne Preisrückwirkung (offen, H3 aus `konzept_monat_v1`).

×10 Markt-Spitze **92,76 GW**, ×10 netzdienlich **50,43 GW**. Die PR-#99-Zahl 92,72 GW entsteht, wenn man 9 × 4,64 GW (gerundet) + 50,96 GW rechnet; mit der ungerundeten Basis 4,64409022 GW sind es 92,76 GW. Differenz 0,04 GW, Rundung, kein inhaltlicher Widerspruch.

Die normalisierte Front (Anteile, ohne Euro) zeigt: H3 gilt auch bei ×5 (70 % Senkung bei 98,9 % des modellinternen Erlöses) und ×10 (70 % bei 96,6 %). Diese Euro-Beträge werden nicht ausgewiesen, der Preisnehmer bricht.

---

## Hypothesen

| Hypothese | Urteil | Beleg |
|---|---|---|
| **H1** Win-win an einem messbaren Teil der Tage (70/70, Tagesspitze) | **Widerlegt** im Oktober mit der festgelegten Schwelle | 0 von 31 Tagen, Maximum 46 % (06.10.) |
| **H2(a)** Der Tag mit dem höheren Erlös ist nicht der mit der größeren Senkung | **Gestützt** | 29.10.: 2,11 Mio. € und nur −0,37 / −3,59 GW; größte Netz-Senkung 4,64 GW an drei anderen Tagen |
| **H2(b)** Marktladen erzeugt eine neue Monatsspitze | **Gestützt**, Preisnehmer, ab ≈ ×3,9 | ×3,8: 64,04 GW (29.10.); ×3,9: 64,43 GW (21.10. 14:00); ×10: 92,76 GW |
| **H3** Ein Kompromiss erreicht 70/70 auf der Monatsfront | **Bestätigt**, deutlich | 70 % Senkung bei 99,6 % Erlös (×2); volle Senkung kostet 0,89 % |
| **H4** Zeitvariables Entgelt verschiebt die Marktfahrweise | **Nicht gerechnet** (kein Auftrag in diesem Lauf) | — |

---

## Konsistenz

- **×1** (0 zusätzlich): Spitze 64 405,9 MW, Erlös 0, Senkung 0, in beiden Modi. Genau der beobachtete Ist.
- **×2 / ×5 / ×10 netzdienlich, Senkung:** 3,590363 / 9,41105 / 13,97944 GW, Abweichung gegen nachrechnung v3 (zwei Methoden, A Bisektion und B LP) unter 0,0001 GW beim Roh-min-Peak; nach Lex-Toleranz 0,05 MW liegt der lex-Peak um 0,05 MW höher (3,590313 statt 3,590363). Unsichtbar bei zwei Dezimalen (3,59 / 9,41 / 13,98).
- **×10 netzdienlich, Spitze:** 50,4265 GW ≈ **50,43 GW**, wie PR #99.
- **×10 Markt, Spitze:** 92,7569 GW ≈ **92,76 GW**. PR #99 nannte 92,72 (Rundung der Flotte auf 4,64 GW), siehe Kernantwort 4.
- **Energiebilanz:** grid-seitiges Entladen / Laden = 0,850000 in allen ausgewerteten Läufen; SoC-Bilanzrückstand < 10⁻⁹ MWh; kein gleichzeitiges Laden und Entladen (Maximum 0 MW); SoC Start = Ende = 50 % der Nennenergie; SoC in 10–90 %.
- Unabhängige Nachrechnung der Erlöse aus den Dispatch-CSV ergibt dieselben Beträge (34 089 905,54 € Markt ×2).
- Monatssumme der isolierten Tageserlöse (Tageshorizont) 32,26 Mio. € gegen Monats-Markt 34,09 Mio. €: die Differenz ist die SoC-Kopplung über Tagesgrenzen, kein Fehler.

---

## Grenzen (stehen an jedem Graph)

- National, Kupferplatte, **kein Netzengpass**, keine örtliche Aussage.
- **Vollvoraussicht** ist eine Obergrenze für Erlös und Senkung.
- **Preisnehmer:** fest angenommene Day-Ahead-Preise. Bricht bei großen Flotten; deshalb keine Euro-Beträge für ×5/×10 und Marktlinie ab dem Kipppunkt als Stresstest, nicht als Prognose. Preisrückwirkung (H3 aus `konzept_monat_v1`) ist offen.
- Keine Intraday-, Regelenergie- oder Kapazitätserlöse, keine Zyklen- oder Alterungskosten, keine Entgelte (§ 118 Abs. 6 EnWG befreit heute). Pumpspeicher wie beobachtet. Die gemessene Restlast enthält die heutigen Speicher schon.
- Die **Monats**-Zielfunktion minimiert das Monatsmaximum, nicht jede Tagesspitze. Für `/tag` gilt der Tageshorizont (Regel T). Beide Maßstäbe müssen beschriftet bleiben.
- fNAV ist stilisiert und national. Eine echte flexible Anschlussvereinbarung ist örtlich (Anschlusspunkt, Haftung, Technik) und aus öffentlichen Daten nicht ableitbar.
- Der günstige Monats-Kompromiss ist an die Form „eine Monatsspitze, wenige Stunden“ gebunden. Ob das in anderen Monaten, insbesondere winterlichen Lastspitzen über viele Tage, so bleibt, ist nicht gerechnet.
- Demo-Monat Oktober 2026, eine Wetterrealisation.

---

## Expertenblick

### A · BESS-Projektentwickler

- **Gegenrechnung:** 0,30 Mio. € für die volle Monatssenkung ist 0,89 % von 34,09 Mio. € (Modellschätzung, Vollvoraussicht, ohne Entgelte und Alterung). Am 21.10. allein kostet der 70-%-Tageskompromiss dagegen 13 % des Tageserlöses (0,56 statt 0,65 Mio. €). Wer die Front als „fast kostenlos“ liest, muss den Maßstab mitlesen.
- **Härteste Gegenfrage, unverändert:** *„Wer zahlt die Differenz?“* Die Front zeigt den Preis, sie erfindet keine Zahlung. Im Oktober ist der Monatspreis klein; er bleibt trotzdem eine Opportunitätskosten-Zahl, die nur ein Tarif, ein Vertrag (fNAV-Deckel, § 17 Abs. 2b), eine §-11a-Ausschreibung oder ein künftiges Entgelt (AgNes, offen) jemandem zuweist. Fehlt jedes Instrument, bleibt der rationale Fahrplan der Markt — mit 0,37 GW Monatssenkung und, an zwei Tagen, einer gehobenen Tagesspitze.
- **Löser:** Endpunkte ohne Lexikographie sind wirtschaftlich wertlos (negativer „Erlös“ von −3,08 Mio. €). Das gehört in die Methodik und in den Bau-Brief.

### B · Netzplaner VNB/ÜNB

- **Gegenrechnung:** „Netzdienlich“ ist hier die nationale Restlastspitze, nicht die Last an einem Umspannwerk. Ein nationaler Win-win (den es im Oktober auf der Tagesebene ohnehin nicht gibt) kann an einem Abgang ein Konflikt sein. Der Graph trägt „national, kein Netzengpass“.
- **Härteste Gegenfrage, verschärft durch die Rechnung:** *„Ein λ kann ich nicht in einen Vertrag schreiben.“* Richtig. Das Abend-Entnahmeverbot, das man schreiben *kann*, landet am Markt-Ende und ändert die Monatsspitze nicht. Was man schreiben kann und was wirkt, ist ein **Leistungsdeckel auf die Restlast nach Speicher** (ε-Schnitt), oder eine Verpflichtung, in einem Fenster einzuspeisen, nicht nur nicht zu entnehmen. Das Mittagsladen am 21.10. muss in das Fenster oder den Deckel, sonst hilft der Vertrag ab ×3,9 nicht gegen die neue Spitze.
- Am 29.10. folgt der Markt dem Preis, die Restlastspitze kommt eine Stunde später. Ein netzdienlicher Fahrplan muss Energie über das Preismaximum hinaus vorhalten.

---

## Was der Bau-Brief an sites enthalten muss

1. **Erst rechnen, dann bauen — diese Zahlen, nicht schätzen.** Front, Klassen und fNAV liegen als CSV/JSON in diesem Ordner. Kein Live-LP im Browser; der Schieber rastet auf vorgelegten Punkten (Dichotomie-Extrempunkte plus ε-50/70/90 und die beiden lex-Endpunkte).
2. **Endpunkte immer lexikographisch.** `solve_min_peak` allein ist nicht der Netz-Endpunkt der Front. Ohne das zweite Ziel (max. Erlös unter der gefundenen Spitze) ist der „Preis der Netzdienlichkeit“ ein Artefakt.
3. **Zwei Maßstäbe, klar beschriftet.** `/monat`-Hero = Monatsfront (H3, fast flach, 0,30 Mio. € für 3,59 GW). `/tag` und der Tagesstreifen = Tageshorizont, Regel T (H1 widerlegt, 0 Win-win). Die Monatsscheibe des Monatsfahrplans nicht als Tagesklasse verwenden.
4. **Hero-Skala nicht so zoomen, dass 0,30 Mio. € groß wirkt, ohne den Kontext 34 Mio. €.** Volle x-Achse plus Zoom, wie G1. 70/70-Feld einzeichnen. Euro nur ×2, „Modellschätzung“.
5. **Kein Text „viele Tage sind Win-win“.** Die 70-%-Schwelle von H1 bleibt die Definition, bis Phillipp sie ändert. Der Streifen zeigt 0 solche Tage, Maximum 46 %. 21.10. und 29.10. sind die Beispieltage (Mittagsladen bzw. Preis- gegen Restlastspitze).
6. **fNAV in v1 als Leistungsdeckel (ε-Schnitt), das Zeitfenster 16–21 Uhr nur als Vergleichspunkt am Markt-Ende.** Nicht als wirksamen Kompromiss verkaufen.
7. **Kipppunkt ≈ ×3,9**, Marktlinie ab dort schraffiert, Preisnehmer, keine Euro für ×5/×10. ×10-Werte: netzdienlich 50,43 GW, Markt 92,76 GW (nicht 92,72).
8. **SoC-Rückkehr 23–24 Uhr** schraffieren oder abschneiden und als Modellartefakt beschriften, nicht als Netzeffekt (Befund Phillipp 12.11.).
9. **Flottenbasis 4,64 GW / 8,15 GWh**, Konvention (a), ×1 = beobachtete 64,41 GW in allen Modi.
10. **Rechtsrahmen** wie im Konzept: die Front zeigt den Preis, sie zahlt ihn nicht. § 118 Abs. 6, § 17 Abs. 2b, AgNes offen, § 14a gilt nicht für diese Flotte.

---

## Offene Risiken

- **Preisrückwirkung** kann den Kipppunkt verschieben oder auflösen und die ×5/×10-Front (nicht die Euro-Aussage, die es dort nicht gibt) verändern. Offen.
- **Andere Monate:** Der günstige Monats-Kompromiss und der Versatz Preis- gegen Restlastspitze am 29.10. sind Oktober-Befunde. Winterliche, langgezogene Lastspitzen sind nicht gerechnet.
- **Zielfunktion „Summe der Tagesspitzen“** wäre eine andere, vermutlich teurere Front. Wer im UI „netzdienlich“ so liest, als sänke jeder Tag, bekommt das vom Monats-Löser nicht.
- **Örtliche Netzwirkung** und ein echter Anschlussvertrag sind aus öffentlichen Daten nicht ableitbar.
- AgNes-Tenor, BK8-Ausgleich, VDE-AR-N 4110/4120: unverändert nicht am Text geprüft.
- Intraday, FCR/aFRR, Kapazität: nicht im Modell; ein realer Erlös weicht von der Modellschätzung ab, Richtung unsicher.

---

## Reproduktion

```
cd /workspace/speicherpilot/forschung/simulator_rechnung_v1
python3 solve_simulator.py    # ≈ 0,2 min, schreibt CSV/JSON
python3 viz_simulator.py      # Graphen in graphs/
```

Eingangsdatei: `beobachtungen-viertelstunden-202610-berlin.csv` (Kopie aus `/workspace/sp-ro/artifacts/october-storage-counterfactual-20261107/inputs/`, sha256 oben). Flottenbasis und Konvention in `meta.json`. Frontpunkte: `pareto_punkte.csv`. Tagesklassen: `tagesklassen_oktober.csv` (Regel T) und `tagesklassen_monatsscheibe.csv` (nur Sensitivität, nicht die Regel). Fahrpläne: `dispatch/`. Checks: `checks.json` (120/120). Prüfprotokoll der Graphen: `protokoll/pruefprotokoll.md`.
