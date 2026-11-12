# SpeicherPilot · /monat neu · Forschungskonzept v1
Stand 11.11.2026, 23:00 MEZ · Entwurf zur Freigabe, nichts gebaut · nur öffentliche Quellen · Daten: Repo-Läufe Oktober 2026 (`data/national-fleet/2026-10`, Stand main 11.11.2026, 22:36 MEZ), Nachrechnung `nachrechnung/monat_v1.py`

**Warum neu:** Der heutige Graph „Arbeit gegen Wirkung“ zeigt drei Fahrweisen auf einer Log-Achse in GWh. Auf der y-Achse steht „Spitze sinkt um“, die Marktlinie fällt aber auf −32 GW, das heißt sie *steigt*. Dazu kommen überlappende Labels und ein Tooltip, der über der Linie liegt. Die Rechnung dahinter ist gut, gezeigt wird sie falsch herum.

## Forschungsfrage
> **Wie weit senkt eine ×1- bis ×10-Batterieflotte die höchste Restlast eines Monats, je nachdem, wofür sie fährt, und ab welcher Flottengröße erzeugt Laden nach Preis eine neue Spitze, statt eine zu senken?**

Wer fragt: Netzplaner (VNB/ÜNB), Projektentwickler und Politik. Entschieden wird, ob der Speicherausbau ein netz- bzw. spitzenorientiertes Signal braucht (flexible Anschlussvereinbarung, BKZ-Modell, Fahrplanvorgaben) oder ob der Markt allein die Spitze senkt.

## Hypothesen (jede widerlegbar)
- **H1 Sättigung:** Spitzenorientiertes Fahren senkt die Monatsspitze bei jeder Größe, aber jedes weitere GW bringt weniger. *Widerlegt, wenn* der Grenznutzen ×5→×10 ≥ ×1→×2 ist. **Oktober:** 0,77 / 0,45 / 0,35 / 0,19 GW je GW, gestützt.
- **H2 Kipppunkt:** Reines Preisladen (Preisnehmer) erzeugt ab etwa ×3 eine neue Monatsspitze über 64,41 GW. *Widerlegt, wenn* ×5 Markt ≤ 64,41 GW bleibt. **Oktober:** 73,86 GW (×5) und 96,76 GW (×10), gestützt, aber nur im Preisnehmermodell.
- **H3 Rückwirkung:** Wenn das Laden den Preis hebt, wandert der Kipppunkt über ×5 oder verschwindet ganz. *Widerlegt, wenn* ein Lauf mit Merit-Order-Rückwirkung bei ×5 trotzdem über 64,41 GW landet. **Offen, braucht einen neuen Lauf.**
- **H4 Stunden vor Gigawatt:** Bei 1,76 h begrenzt die Energie die Senkung, nicht die Leistung. *Widerlegt, wenn* unbegrenzte Leistung bei gleicher Energie mehr Senkung bringt. **Oktober:** ×1 bis ×10 bleiben identisch (−3,59 … −14,78 GW), gestützt.

## Simulationsdesign ×1 bis ×10
| Annahme | Wert | Quelle | Einheit | Unsicherheit |
|---|---|---|---|---|
| Restlast | Last inkl. Eigenverbrauch − Wind on/off − Solar, 2 980 Viertelstunden Okt. 2026 | Energy-Charts `total_power` | MW | Revisionen; zwei Punkte am 11.11. bestätigt (Review B) |
| Flottenbasis | **4,64 GW / 8,15 GWh ≈ 1,76 h** | battery-charts `bess_monthly_*`, Großspeicher, Stand 31.10., abgerufen 10.11.2026 | GW, GWh | MaStR-Nachmeldungen. Die Repo-Läufe nutzen noch 4,58/8,00, Abweichung ≤ 0,15 GW Spitzensenkung (nachgerechnet) |
| Faktor ×k | Repo-Lauf: k × Flotte zusätzlich auf die beobachtete Restlast. konzept_v2: (k−1) × Zusatz | – | – | **vor dem Bau festlegen und neu rechnen**, sonst zählen /tag und /monat ×2 verschieden |
| Wirkungsgrad | Round-Trip 85 % (80–90 %) | Modellannahme | % | ×10: −14,54 / −14,78 / −15,00 GW |
| SoC | 10–90 %, Start = Ende = 50 % | Modellannahme | % | – |
| Preis | Day-Ahead DE-LU, 15 min, nur DA | SMARD/BNetzA über Energy-Charts | €/MWh | keine Intraday-, Regelenergie- oder Netzentgeltsignale |
| Fahrweisen | **Spitze** (min. Monatsmaximum, Vollvoraussicht = Obergrenze), **Überschuss** (max. Aufnahme aus Σ max(0, W+S−Last) = 134,2 GWh, Tiebreak Spitze), **Markt** (max. DA-Erlös, Preisnehmer) | Repo-Solver HiGHS | – | Vollvoraussicht überschätzt alle drei |

**Der Preisnehmer bricht bei ×5 und ×10.** Das Modell nimmt die Preise als fest an, egal wie viel die Flotte lädt. 45,8 GW Laden zur selben Viertelstunde würden den Preis in Wirklichkeit heben und die Spanne schließen. Deshalb explodiert die Marktlinie. Der Beleg: Der ×1-Marktfahrplan, einfach mit k multipliziert, ergibt ×5 = 73,86 und ×10 = 96,76 GW genau. Die großen Läufe enthalten also keine neue Information, nur Skalierung. Kipppunkt bei linearer Skalierung: k ≈ 2,9, also ≈ 13,4 GW.

**Sensitivitäten:** Dauer 1,76 / 2 / 4 h (bei gleicher Leistung). Wirkungsgrad 80–90 %. Flottenbasis. Preisrückwirkung als Pflichtlauf für H3. Grob geschätzt aus Oktober: 4,2 €/MWh je GW Restlast (OLS, r² 0,80). **Grenzen:** eine Kupferplatte Deutschland, kein Netz, keine örtliche Abregelung, kein (n-1); keine Zyklengrenze, keine Degradation; Pumpspeicher wie beobachtet; nur Oktober 2026 hat einen Lauf.

## Kernantworten, je ein Graph (390 px zuerst, kein Log, kein Tooltip über der Kurve, Werte in fester Zeile unter dem Graph)
1. **Dieselbe Flotte senkt die Spitze oder hebt sie, je nach Fahrweise.** Spitzenorientiert sinkt das Oktobermaximum von 64,41 auf 49,77 GW (×10). Nach Preis steigt es ab ≈ ×3 auf bis zu 96,76 GW.
   *Graph (Hero):* Die x-Achse ist die Flottengröße ×1…×10, linear, mit GW-Unterzeile (4,6 … 46). Die y-Achse ist die **höchste Restlast des Monats in GW, absolut** (40–100). Eine Referenzlinie bei 64,4 heißt „Oktober, beobachtet“. Drei Linien sind am Ende direkt beschriftet, die Fläche über 64,4 ist getönt („neue Spitze“). Ab ×3 läuft die Marktlinie schraffiert und gestrichelt: „ohne Preisrückwirkung“. **In 5 s:** eine Linie fällt, eine steigt über die Referenz.
2. **Die neue Spitze sitzt mittags, nicht abends.** Am 21.10. um 14:00 kommen 50,96 GW Restlast und 45,80 GW Laden zusammen, bei einem beobachteten Day-Ahead-Preis von 201,29 €/MWh, denn abends lag er bei bis zu 279,61. Bei ×10 liegt die Last an 24 von 31 Tagen in 204 Viertelstunden über der alten Spitze.
   *Graph:* Tageskurve 21.10., x 00–24 Uhr, y GW. Grau ist beobachtet, darauf die Markt-×10-Kurve, die Mittagskuppe ist annotiert mit „+45,8 GW Laden“. Darunter ein 31-Tage-Strich (Tage über 64,4 farbig). **In 5 s:** die Kuppe wächst mittags über den Abend.
3. **Es fehlen Stunden, nicht Gigawatt.** Unbegrenzte Leistung ändert nichts. Mit 4 h statt 1,76 h steigt die Senkung bei ×1 von 3,59 auf 4,64 GW und bei ×10 von 14,78 auf 18,31 GW. ×5 mit 4 h (23 GW) senkt mehr (15,56) als ×10 mit 1,76 h (46 GW). Bei ×10 nutzt die spitzenorientierte Flotte nur 14,6 von 45,8 GW Entladeleistung.
   *Graph:* Hantel- bzw. Punktdiagramm, x = ×1/×2/×5/×10, y = Spitzensenkung in GW, je Stufe drei Punkte für 1,76 / 2 / 4 h. **In 5 s:** Der 4-h-Punkt liegt immer deutlich höher.
4. **Überschuss allein trägt nicht.** ×10 nimmt den ganzen Oktober-Pool von 134,2 GWh auf (×1: 42 %, ×2: 61 %, ×5: 84 %), senkt die Spitze aber nur um 7,91 GW, gegenüber 14,63 GW spitzenorientiert.
   *Graph:* ein waagerechter Balken „Pool 134,2 GWh“, gefüllt je Stufe, rechts daneben die Spitzensenkung als Zahl. **In 5 s:** Der Balken ist bei ×10 voll, die Spitze kaum tiefer.

Euro steht nicht auf der Seite. Wenn überhaupt, dann nur ×1 als „Modellschätzung“ (Review A). Unter jedem Graph steht „national, kein Netzengpass, Vollvoraussicht“.

**Empfehlung zum GO:** Antworten 1, 3 und 4 jetzt bauen, die Marktlinie ab ×3 schraffiert. Antwort 2 und die volle Marktlinie erst nach dem Rückwirkungslauf (H3). Vorher die Basis auf 4,64/8,15 umstellen und die Konvention ×k festlegen.

---
## Expertenreview (zwei getrennte Rollen)

### A · BESS-Projektentwickler
- **Primärquellen:** Energy-Charts `price` DE-LU 21.10.2026 14:00 = **201,29 €/MWh** bestätigt (Lizenz CC BY 4.0, BNetzA/SMARD; abgerufen 11.11.2026, 22:55 MEZ; Kopie in `quellen/`). battery-charts 31.10.: 4,644 GW / 8,152 GWh (Kopie vom 10.11.2026). Intraday-, Regelenergie- und Kapazitätserlöse sind nicht geprüft und nicht im Modell.
- **Gegenrechnung:** Markt ×1 lädt 485,5 GWh im Monat, das sind ≈ 61 Nennzyklen in 31 Tagen, ≈ 2,0 pro Tag (bezogen auf die nutzbaren 6,4 GWh ≈ 2,4). DA-Erlös ×1 im Oktober: **≈ 33,5 Mio € (Modellschätzung**, Vollvoraussicht, ohne Entgelte und Degradation, Obergrenze, nicht skaliert). Spitzenorientiert ×1 bringt im selben Modell ≈ 1,0 Mio €: Die Spitze zu senken kostet fast den ganzen Arbitrageerlös. Kipppunkt aus dem Fahrplan: (64,41 − 50,96) / 4,58 ≈ ×2,9.
- **Härteste Gegenfrage:** *„Niemand fährt zwei Zyklen am Tag mit perfekter Voraussicht und ohne Preiswirkung. Ist die Marktlinie dann nicht ein Strohmann gegen den Markt?“* **Antwort:** Als Prognose ja. Darum ist sie ab ×3 als Stresstest schraffiert, und ohne Rückwirkungslauf wird keine Markt-Zahl für ×5/×10 behauptet. Die Frage selbst bleibt aber echt: Mit der groben Steigung von 4,2 €/MWh je GW lohnt sich volles Laden am 21.10. (153 → 280 €/MWh, 85 %) nur bis ≈ 11 GW. Das liegt in derselben Größenordnung wie der Kipppunkt von ≈ 13 GW. Ob der Markt rechtzeitig selbst bremst, kann nur H3 beantworten.

### B · Netzplaner VNB/ÜNB
- **Primärquellen:** Energy-Charts `total_power` 21.10.2026 14:00: Last 70 828,9 MW, Wind 8 878,4 MW, Solar 10 990,0 MW, also **Restlast 50 960,5 MW**, gleich dem Repo-Wert. 29.10. 18:15: **64 405,9 MW**, gleich der Repo-Basisspitze (beides abgerufen 11.11.2026, 22:55 MEZ). SMARD/BNetzA-Netzengpassberichte (Redispatch) sind örtlich und aus der nationalen Restlast nicht ableitbar. VDE-AR-N 4110/4120 (technische Anschlussregeln Mittel- bzw. Hochspannung inkl. Speicher): Die Normen sind kostenpflichtig, **in diesem Lauf nicht inhaltlich geprüft** und werden nur als Grenze genannt.
- **Gegenrechnung:** 50,96 + 45,80 = 96,76 GW ✓, 50,96 + 22,90 = 73,86 GW ✓. Spitzenorientiert per Bisektion (unabhängig vom Repo-LP): −3,55 / −5,60 / −10,34 / −14,63 GW, gleich dem Repo. Markt ×10 senkt das Restlastminimum auf −55,6 GW, das ist Rückspeisung in derselben Größenordnung. Spitzenorientiert ×10 lädt bis zu 33,5 GW gleichzeitig.
- **Härteste Gegenfrage:** *„Eine nationale Restlastspitze ist nicht die Spitze an meinem Umspannwerk. Was sagt mir eure ‚neue Spitze‘?“* **Antwort:** Über ein einzelnes Betriebsmittel sagt sie nichts. Sie zeigt aber die **Gleichzeitigkeit**: Preisgeführte Speicher laden alle in derselben Viertelstunde, national bis zu 45,8 GW bei ×10. Diese Gleichzeitigkeit sitzt an konkreten Anschlusspunkten, und mit ihr rechnet die Netzplanung (Gleichzeitigkeitsfaktor, flexible Anschlussvereinbarung). Deshalb steht „national, kein Netzengpass“ direkt am Graph. Eine örtliche Aussage braucht Standortdaten, die nicht öffentlich sind.

**Nicht verifizierbar in diesem Lauf:** Preisrückwirkung (nur grobe Regression), Monate außer Oktober, Intraday und Regelenergie, Inhalt der VDE-Normen, örtliche Netzwirkung.

---
Nachtrag 12.11.2026 09:25: ×k-Konvention vereinheitlicht auf Variante (a): ×k = k-mal die heutige Flotte insgesamt, ×1 = Ist-Zustand ((k−1)-mal zusätzlich). Alle /monat-Zahlen oben beziehen sich noch auf die alte Zählung (k-mal zusätzlich) und werden beim Bau neu gerechnet.
