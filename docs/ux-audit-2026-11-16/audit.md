# UX-Audit speicherpilot.app – Verständlichkeit aller Seiten

Stand: 16.11.2026, 17:15 (Berlin). Live-Seite gegen Repo-Stand `016366a` (main, #118 gemergt).
Methode: HTML per curl, Volltext + Full-Page-Screenshots mit Headless Chrome (Playwright) bei 1280 px und 390 px, hell. Jede Zahl, die unten erklärt wird, ist im Code nachgeprüft (Pfad steht dabei).
Rohdaten: `html/*.txt` (sichtbarer Text je Seite), `screens/*_d.png` (1280), `screens/*_m.png` (390), `shots_before/` (die 5 schlimmsten Stellen).

**Seitenbestand live:** `/` (Gestern), `/tag/<datum>`, `/tag/<heute>` (laufend), `/monat/2026-10` (Regler), `/monat/2026-11` (laufender Monat), `/vision`, `/simulator`, `/methodik`, `/beitraege`, `/beitraege/<slug>`, `/impressum`, `/datenschutz`.
Weiterleitungen: `/szenarien`, `/netz`, `/ort`, `/site` → `/simulator`; `/live` → `/tag/<heute>`; `/news` → `/beitraege#extern-gelesen`; `/blog` → `/beitraege#artikel`; `/monat` → `/monat/2026-10`; `/jahr` → `/vision`.

**Leser:** T = Fachleser (BESS-Entwickler, VNB-Netzplaner), L = interessierter Laie.
**Bewertung:** ✅ klar · ⚠️ unklar · ❌ irreführend. **Fix:** A = Text/Label/Zahlenkontext (klein, sicher) · B = Layout/Struktur.
**Schwere:** S1 = irreführend oder Regelverstoß · S2 = unklar, Kernaussage kommt nicht an · S3 = Politur.

---

## Was 8,27 GWh auf /tag bedeutet (Anlass)

`components/home/TagSystemChapter.tsx:45` zeigt `fleetEnergyGwh`. Der Wert kommt aus `view.dispatch.fleet.energyGwh` (`lib/germanyView.ts:84–95`, `fleetPublic`). Quelle ist der Live-Abruf von Battery Charts (RWTH/ISEA, `lib/largeBatteryFleet.ts:33`). Im HTML von /tag/2026-11-15 steht dazu „4,70 GW / 8,27 GWh, 15.11.2026“.

**8,27 GWh ist also die installierte Speicherkapazität aller deutschen Großbatteriespeicher (Stand 15.11.).** Das ist keine Tageszahl, und an dem Tag wurde nichts geladen oder verschoben. Der Text darunter sagt nur: Wind und Sonne lagen den ganzen Tag unter dem Verbrauch, also hatte das Überschuss-Modell nichts zu laden. Die große Zahl und der Satz darunter widersprechen sich deshalb scheinbar.

Zusätzlich gibt es drei verschiedene Flottenstände auf der Seite:
- 4,70 / 8,27 auf /tag, /vision und /tag/heute (live, Stand 16.11.)
- 4,64 / 8,15 auf der Startseite, /simulator und /monat (Basis der Oktober-Rechnung, Stand 31.10.)
- 4,7 / 8,3 bzw. 4,64 / 8,14 in der Methodik

Nirgends steht, warum es zwei Stände gibt.

---

## Top 10 (nach Schwere)

| # | Seite · Stelle | Problem | Schwere | Fix |
|---|---|---|---|---|
| 1 | /tag · 02 „Das System“ | 8,27 GWh (installierte Flottenkapazität) steht als Kernzahl, darunter „nichts zu laden“. Leser lesen das als Tagesleistung. | S1 ❌ | A |
| 2 | /simulator (+ Teaser auf / und /tag) | Fahrweise heißt „**Netzdienlich**“ (Pareto-Punkt, Tabelle, Tooltip, Legende, fNAV-Chart). Das ist eine eigene Wertung und verstößt gegen die Wortregel. Dazu: „netzdienlich = senkt die Monatsspitze“. | S1 ❌ Regel | A |
| 3 | /simulator | Euro-Beträge (34,09 Mio. € usw.) für „×2“. Die Methodik sagt wörtlich „Ab ×2 keine Euro-Werte in der Oberfläche“, die Regel sagt „Euro nur für ×1“. „99,64 % **Marktanteil**“ ist falsch benannt: gemeint ist der Anteil am Max.-Erlös. | S1 ❌ | A (+ Entscheidung, s. konzept_B D1) |
| 4 | /monat/2026-11 | Datenstand eingefroren am 09.11., „22 Kalendertage fehlen“, obwohl /tag bis 15.11. Daten hat. Satz „mit Differenz aufnehmen ×1 liegt die Spitze bei 68,03 GW“ behauptet eine Modellfahrweise, obwohl daneben „kein Modelllauf“ steht. Die Kurve „nach Restlast sortiert“ ist statisch unsortiert. Mobil steht der Text in falscher Reihenfolge und ohne Rand. | S1 ❌ | A + B |
| 5 | / Hero | „−4,7 GW · **Spitze** bei ×5“: Die Zahl ist eine Senkung, keine Spitze. ×1 (heute) fehlt im Umschalter. „4-h-Geist: gestrichelt“ ist nicht zu finden, weil die 4-h-Linie genau auf der ebenfalls gestrichelten ×10-Linie liegt. „Fehlten Stunden, nicht Gigawatt“ wird nirgends begründet (Spitze dauert ~7 h, Flotte hält 1,76 h). | S2 ⚠️ | A |
| 6 | /simulator, Teaser auf / und /tag | Hauptzahl „0,36 %“ mit „ε-70“. Phillipp: „nicht greifbar, klingt nach nichts“. Die eigentliche Botschaft (0,37 → 2,51 GW Senkung bei fast gleichem Erlös) steht nur klein. Die H-Zeile „Mehr Gigawatt helfen. Mehr Stunden helfen mehr.“ passt nicht zum Inhalt der Seite (Fahrweise, nicht Dauer). | S2 ⚠️ | A (Text) + B (Seitenaufbau) |
| 7 | /tag · 01 „Der Tag“ | Kernzahl „< 0,05 GWh“ ohne Label: Was ist das? Es ist der Tagesüberschuss. Der Preisgraph hat keine Überschrift und keine Erklärung der Punkte. Kopfzeile „— nur die Überschuss-Kennzahl.“ ist ein unverständlicher Satzrest. | S2 ⚠️ | A |
| 8 | /tag/heute (laufend) | „Preisvorschau morgen: **206 bis 131** €/MWh“ ist erster und letzter Viertelstundenpreis, kein Min–Max. Das liest sich wie eine Spanne und ist falsch. | S1 ❌ | A |
| 9 | /vision | NEP A/B/C, „Kupferplatte“, „OLS-Band b … 2b“, „Rückw. 2,86“, „Vorjahr NEP C: −10,5 bis −13,4“ (sieht aus wie eine Spanne, ist aber Vorjahr vs. dieses Jahr) bleiben unerklärt. „Ab NEP A bringt jedes GW wenig“: Die x-Achse hat keine Einheit, NEP A steht nur als Buchstabe. | S2 ⚠️ | A + B |
| 10 | /beitraege + Artikel KW 46 | Öffentlich sichtbar: interne Dateipfade („karten/05_beobachtung.png …“), „Veröffentlichen machen Sie selbst.“ (an Phillipp gerichteter Satz), Chart-Unterschrift „Markt55,6 GW“ (fehlendes Leerzeichen) und „beobachtet 54,3 GW um **18:00**“, obwohl der Fließtext und /simulator 18:30 sagen (Stundenraster statt Viertelstunde). News-Headline „…schreibt **netzdienlichen** Speicher…aus“ steht als eigene Überschrift. Einordnung nennt 23,7 GW statt 23,8 GW. | S1/S3 | A |

Weitere wichtige Punkte außerhalb der Top 10: 3 Flottenstände ohne Erklärung (S2, A); Methodik-Kurzfassung A1 beschreibt ein altes Modell („Laden vor 17 Uhr, Abgabe ab 17 Uhr“, „Testnetz SimBench“) (S1, A); Methodik-Abschnitte „Badge netzdienlich v1/v2“, „Einschätzung netzdienlich“ (Regel, A); /monat/2026-10 hat zwei H1 und doppelte 50,4-GW-Kernzahl (S3, A/B); Fußzeile „national, kein (n−1), nicht Abregelung“ steht 4× pro Seite und ist Fachjargon (S3, A); /simulator mobil 11 px horizontaler Überlauf (401 px Seitenbreite bei 390 px Viewport) (S3, A-CSS).

---

## Seite für Seite

### 1. Startseite `/` („Gestern“)

| Abschnitt | (1) soll sagen | (2) T / L | (3) Problem | (4) bessere Darstellung | (5) |
|---|---|---|---|---|---|
| Hero „Gestern fehlten Stunden, nicht Gigawatt.“ −4,7 GW | Gestern hätte mehr Leistung wenig gebracht, weil die Abendspitze länger dauert als die Flotte entladen kann. | T ⚠️ / L ❌ | Meta „Spitze bei ×5“ ist falsch benannt (es ist die Senkung). ×1 fehlt, Basis unklar (Senkung gegenüber was?). Die Begründung (Dauer der Spitze vs. 1,76 h) fehlt. Legende „4-h-Geist: gestrichelt“ trifft nicht zu: Inaktive Stufen sind auch gestrichelt, und die 4-h-Linie liegt bei ×5 exakt auf ×10. | H1 bleibt. Darunter eine Zeile: „Die Abendspitze am 15.11. dauerte rund 7 Stunden über 19 GW. Die Großspeicher halten ihre volle Leistung nur 1,76 h.“ Meta: „Senkung der Tagesspitze mit 5-facher Flotte · Modell, national“. 4-h-Linie direkt beschriften („×5 mit 4 h“), inaktive Stufen gepunktet statt gestrichelt. | A (Text), B (×1 im Umschalter) |
| „Diese Woche · 09.–15.11.“ Balken | Doppelte Flotte hätte jeden Tag 2,5–3,8 GW Spitze gesenkt. | T ✅ / L ⚠️ | Eyebrow „DIESE WOCHE“, Headline „Letzte Woche“. „Doppelt so viel Speicher“ = ×2? Der Sonntagsbalken hat einen grauen Hintergrund bis −5 ohne Erklärung. | Eyebrow „LETZTE 7 TAGE · 09.11.–15.11.“. Headline „Mit doppelter Flotte (×2) wäre die Tagesspitze letzte Woche jeden Tag um 2,5 bis 3,8 GW gesunken.“ | A |
| „Sättigung · 12 Monate“ | Ab ×5 bringt jedes zusätzliche GW Speicher kaum noch Spitzensenkung. | T ⚠️ / L ❌ | „0,14 je GW / 0,07 je GW“ ohne Einheit. „Wolke“, „P10–P90“, „Median“ für Laien unerklärt. Die x-Achse startet bei ×1 = 0, damit ist die Basis = heutige Flotte (das wird nicht gesagt). | Labels „0,14 GW weniger Spitze je GW Speicher (×2→×5)“ / „0,07 GW je GW (×5→×10)“. Meta: „Graue Punkte: jeder Tag der letzten 365 Tage. Rot: gestern. Basis: heutige Flotte (×1 = 0).“ | A |
| News · geprüft (3 Meldungen) | Was diese Woche für Speicher/Netz relevant war, mit Einordnung. | T ✅ / L ✅ | Photon-Headline „…schreibt netzdienlichen Speicher…aus“ ist unsere Formulierung. Einordnung Bundestag: „23,7 GW“, die Daten sagen 23,79 → 23,8 (siehe /tag). Einordnungen sind lang und als Monospace-Block schwer lesbar. | Headline „Verteilnetzbetreiber schreibt Speicher mit vorgegebener Fahrweise statt Netzausbau aus“. 23,8 GW. | A |
| Simulator-Teaser „0,36 %“ | Gegen die Spitze fahren kostet kaum Erlös. | T ⚠️ / L ❌ | 0,36 % ist nicht greifbar (Phillipp). „ε-70“ ist Jargon. „Flotte ×2, Modellschätzung“, aber es steht kein Euro da. | „Doppelte Flotte: Nach Preis sinkt die Oktober-Spitze um 0,37 GW, mit Rücksicht auf die Spitze um 2,51 GW.“ Sub: „Dafür 0,36 % weniger Day-Ahead-Erlös (Modell, national, kein Netzengpass).“ | A |
| Fußnote „Flotte 4,64 GW / 8,15 GWh, Stand 31.10.“ | Datenbasis. | T ⚠️ | Andere Zahl als /tag (4,70 / 8,27). | „Oktober-Rechnung: Flotte 4,64 GW / 8,15 GWh (Stand 31.10., Battery Charts). Heute: 4,70 GW / 8,27 GWh.“ | A |

### 2. Tagesseite `/tag/<datum>` (Beispiel So, 15.11.)

| Abschnitt | (1) | (2) T / L | (3) Problem | (4) | (5) |
|---|---|---|---|---|---|
| Kopf „21. Tag in Folge ohne Überschuss“, Börsenpreis 98–180 | Seit 3 Wochen gibt es keinen Tag, an dem Wind und Sonne den Verbrauch übertreffen. | T ✅ / L ⚠️ | „Überschuss“ wird nicht definiert (national, Wind+Sonne > Verbrauch, keine Abregelung). Subline „Zuletzt Überschuss am So, 25.10. — nur die Überschuss-Kennzahl.“ ist ein Satzrest. Die Riesen-21 und die Sparkline „Überschuss je Tag“ haben keine Achse oder Datumsangabe. | Subline: „Zuletzt lagen Wind und Sonne am So, 25.10. bundesweit über dem Verbrauch.“ Sparkline-Label: „Überschuss je Tag, 10.10.–15.11.“ (+ erstes/letztes Datum an der Achse). | A |
| 01 „Was am 15.11. im Stromnetz passiert ist“ – „< 0,05 GWh“ | Kein Überschuss. Die Abendspitze der Restlast lag bei 23,8 GW. | T ⚠️ / L ❌ | Kernzahl ohne Benennung. Der Graph hat keine y-Achse. Der Preisgraph darunter hat keine Überschrift, und die orangen Punkte (= die günstigsten/teuersten Viertelstunden für die Flotte) sind nicht erklärt. | Kernzahl „Überschuss: unter 0,05 GWh“. Lead: „Wind und Sonne lagen den ganzen Tag unter dem Verbrauch. Die Restlast (Verbrauch minus Wind und Sonne) erreichte 23,8 GW um 17:00 Uhr.“ Preisgraph-Titel: „Day-Ahead-Preis, €/MWh · Punkte: die 5 günstigsten und 5 teuersten Viertelstunden für die heutige Flotte“. | A |
| 02 „Das System“ – 8,27 GWh | Was hat die Speicherflotte an diesem Tag getan? | T ❌ / L ❌ | **siehe Top 1.** Datum ohne Schlusspunkt („So, 15.11“). | H2 „Speicher am So, 15.11.: nichts geladen“. Kernzahl „0 GWh“. Sub: „Die deutschen Großspeicher (4,70 GW / 8,27 GWh, Battery Charts, Stand 15.11.) hatten im Überschuss-Modell nichts aufzunehmen, weil Wind und Sonne nie über dem Verbrauch lagen. Wie die Flotte nach Preis oder gegen die Abendspitze fahren würde, rechnen wir bisher für Oktober: /monat/2026-10.“ | A |
| Markt-Insights (4 Regelsätze) | Auffälligkeiten aus Preis- und Lastdaten. | T ⚠️ / L ⚠️ | Die Sätze beziehen sich auf den 10.10.–15.11. statt auf den Tag selbst (z. B. Spannen 10.10. vs. 12.10.). Der erste Satz wiederholt den Kopf. „Regel“ als Link-Text ist unverständlich. | Nur Sätze zeigen, deren Zeitraum den Tag enthält. Den Duplikat-Satz ausblenden. Link-Text „Wie berechnet“. | A (Text) / B (Filterlogik) |
| „So gerechnet“ (zugeklappt) + Simulator-Teaser | Rechenweg / Querverweis. | ✅ / ⚠️ | Teaser wie auf der Startseite (0,36 %, ε-70). | wie Startseite | A |

### 3. `/tag/<heute>` (Tag läuft)

| Abschnitt | (1) | (2) | (3) | (4) | (5) |
|---|---|---|---|---|---|
| Kopf „der Tag läuft noch“ | Vorläufige Werte. | ✅ / ✅ | – | – | – |
| 01 Restlast bis Stand 15:30 | Bisheriger Verlauf. | T ✅ / L ⚠️ | Die gestrichelte Strecke (≈12:30–15:30) ist nicht erklärt (vorläufig/Prognose?). | Legende „gestrichelt = vorläufige Werte“. | A |
| 02 Day-Ahead und Markt-Fahrplan | Wann die Flotte nach Preis laden und entladen würde. | T ✅ / L ⚠️ | **„Preisvorschau morgen: 206 bis 131 €/MWh“** ist erster und letzter Wert, nicht Min–Max (S1). Der Link „Nur als Preisvorschau“ zeigt auf /tag/morgen, das umleitet. | Min/Max rechnen: „Preise morgen (17.11.): 131 bis 206 €/MWh (Day-Ahead).“ Den Link entfernen. | A |

### 4. `/monat/2026-10` (Regler, seit #118)

| Abschnitt | (1) | (2) | (3) | (4) | (5) |
|---|---|---|---|---|---|
| Regler-Hero „Wie hätte eine größere Flotte den Oktober verändert?“ | Flottengröße und Fahrweise ausprobieren, Monatsspitze ablesen. | T ✅ / L ⚠️ | Unter dem Regler steht der Entwicklertext „Dauer: 1,76 h aktiv · 2 h und 4 h ohne Zeitreihe — siehe Graph darunter.“ „Δ zur Beobachtung“ ist Jargon. | „Speicherdauer heute: 1,76 h. Längere Speicher zeigt der Abschnitt ‚Es fehlen Stunden‘ weiter unten.“ / „Δ zur Beobachtung“ → „gegenüber gemessen (64,4 GW)“. | A |
| „Dieselbe Flotte senkt die Spitze oder hebt sie.“ 50,4 GW | Die Fahrweise entscheidet. Nach Preis entsteht ab ×3,9 eine neue Spitze. | T ✅ / L ⚠️ | Die Kernzahl 50,4 GW wiederholt den Hero. Die eigentliche Pointe (Kipppunkt, 92,8 GW) steht klein. Die Seite hat eine zweite H1. | Kernzahl „ab ×3,9“. Lead: „Ab etwa der 3,9-fachen Flotte erzeugt Laden nach Preis eine neue Monatsspitze (×10: 92,8 statt 64,4 GW). Gegen die Spitze gefahren sinkt sie auf 50,4 GW.“ H1 → H2. | A |
| „Es fehlen Stunden, nicht Gigawatt.“ −14,0 GW | ×5 mit 4 h = ×10 mit 1,76 h. | T ✅ / L ⚠️ | Label „−4,64 GW“ bei ×2 sieht aus wie die Flottenleistung (ist Zufall: Die Zusatzleistung wird voll genutzt). | Tooltip/Note: „Bei ×2 reicht die Energie, die Zusatzleistung von 4,64 GW wird voll genutzt.“ | A |
| „Überschuss allein trägt nicht.“ 134,2 GWh | Selbst wenn ×10 fast den ganzen Überschuss aufnimmt, sinkt die Spitze nur um 7,7 GW. | T ⚠️ / L ❌ | 134,2 GWh ohne Benennung. „Aufnahme-Pool“ ist Jargon. | Kernzahl „134,2 GWh Überschuss im Oktober“. Lead: „So viel Wind- und Sonnenstrom lag im Oktober über dem Verbrauch. ×10 nimmt fast alles auf, senkt die Spitze damit aber nur um 7,7 GW. Gegen die Spitze gefahren: 14,0 GW.“ | A |
| Pflichtzeile unter jedem Graph | Modellgrenzen. | T ✅ / L ❌ | 4× identisch: „national, kein (n−1), nicht Abregelung; Markt = Stresstest ohne Preisrückwirkung“. | Einmal am Seitenende in Klartext (siehe fixes_A). Unter den Graphen nur „Modell · Details unten“. | A / B |

### 5. `/monat/2026-11` (laufender Monat)

| Abschnitt | (1) | (2) | (3) | (4) | (5) |
|---|---|---|---|---|---|
| Kopf „8 Tage unter der Überschuss-Schwelle“ | November bisher ohne Überschuss. | T ❌ / L ❌ | Eyebrow „Datenstand Energy-Charts-Snapshot · eingefroren 2026-11-09 · eingefrorene Tage“ ist Entwicklertext. „22 Kalendertage fehlen“: 14 davon liegen in der Zukunft, 7 hat /tag längst (09.–15.11.). Der Monat ist veraltet. | Eyebrow „Monat · November 2026 · Daten bis 08.11.“. Sub: „09.–15.11. folgen, 16.–30.11. liegen in der Zukunft.“ Eigentlicher Fix: Monatsseite aus derselben Reihe wie /tag speisen (B). | A + B |
| Kasten „Modellflotte für November“ | Kein Modelllauf. | ✅ / ⚠️ | Desktop: Der Kasten klebt am linken Bildrand (kein Container). Mobil steht er vor der H1. | Ins Raster setzen, unter die H1. | B |
| „Der Monat sortiert sich“ 68,03 GW | Dauerlinie der Restlast. | ❌ / ❌ | Der Satz „mit Differenz aufnehmen ×1 liegt die Spitze bei 68,03 GW“ behauptet eine Fahrweise ohne Modelllauf. Die statische Kurve ist **nicht** sortiert, obwohl die Achse „nach Restlast sortiert“ sagt. Die Achse sagt 745 h, geladen sind 8 Tage. „Weiße Linie“, im Hellmodus ist sie schwarz. Eyebrow und Fußnote stehen ohne Rand. | „November bis 08.11.: höchste gemessene Restlast 68,03 GW.“ Sortierung ohne Scroll-Trigger als Standard. Linie „Linie: gemessene Restlast“. | A (Text) + B (Chart) |
| „Beobachteter Überschuss“ + Tabelle 30 Zeilen | Kein Überschusstag. | ✅ / ⚠️ | 22 Zeilen „noch nicht —“. Aufklapper „Klarstellung Beobachtungsgraph“: Der Titel sagt nicht, was drinsteht. | Tabelle nur mit vorhandenen Tagen. Aufklapper-Titel „Warum hier keine Balken stehen“. | A |

### 6. `/vision`

| Abschnitt | (1) | (2) | (3) | (4) | (5) |
|---|---|---|---|---|---|
| H1 „Was bringt der NEP-Ausbau übers Jahr?“ + Intro | Wie viel die im Netzentwicklungsplan erwarteten Großspeicher die Jahresspitze senken würden. | T ⚠️ / L ❌ | „NEP“, „Kupferplatte“, „Vollvoraussicht“ sind unerklärt. | Intro: „NEP = Netzentwicklungsplan Strom. Seine Szenarien A, B und C erwarten deutlich mehr Großspeicher. Wir rechnen sie in das Stromsystem des letzten Jahres: Deutschland als ein Netzknoten ohne Leitungsengpässe, mit perfekter Vorausschau. Das ist eine Obergrenze.“ | A |
| „Ab NEP A bringt jedes GW wenig“ −13,4 GW | Abnehmender Grenznutzen. | T ⚠️ / L ❌ | „Vorjahr NEP C: −10,5 bis −13,4“ sieht aus wie eine Spanne, ist aber Vorjahr vs. dieses Jahr. Die x-Achse hat keine Einheit (GW Speicherleistung). A/B/C stehen nur als Buchstaben. „≥ 78 GW Zusagen*“: Das Sternchen wird nicht aufgelöst. | Meta: „Jahresspitze 73,0 GW (03.12.2025, 17:00). NEP C senkt sie um 13,4 GW (Vorjahreszeitraum: 10,5 GW).“ x-Achse „Speicherleistung, GW“. Stützstellen „NEP A · 41 GW“. Sternchen auflösen. | A |
| „Nach Preis bleibt die Jahresspitze stehen“ | Marktfahrweise senkt die Spitze kaum. | T ⚠️ / L ❌ | „OLS-Band b … 2b“ und „gekappter Stresstest“. | „Preisrückwirkung grob geschätzt aus historischen Preisen (Band: einfache bis doppelte Wirkung). Keine Prognose.“ | A |
| „An 51 Tagen fährt selbst NEP C am Limit“ | Engpässe im Winterhalbjahr. | T ✅ / L ⚠️ | „hält 59,6 GW“ ist unklar. | „NEP C kann die Restlast nicht unter 59,6 GW drücken (NEP A: 63,2 GW).“ | A |
| „Ab NEP B ist der Überschuss voll“ | Überschuss ist begrenzt. | T ⚠️ / L ❌ | „Pool“, „Rückw. 2,86“. | „Strich: nach Preis, mit grober Preisrückwirkung“. | A |

### 7. `/simulator`

| Abschnitt | (1) | (2) | (3) | (4) | (5) |
|---|---|---|---|---|---|
| Kopf „Mehr Gigawatt helfen. Mehr Stunden helfen mehr.“ | – | ❌ | Passt nicht zur Seite. Die Seite handelt von der Fahrweise, nicht von der Dauer. | „Fahrweise schlägt Größe: Dieselbe Zusatzflotte senkt die Oktober-Spitze nach Preis um 0,37 GW, mit Rücksicht auf die Spitze um 2,51 GW.“ | A |
| Pareto „0,36 % für 70 Prozent der Monatssenkung“ | Kompromiss: viel Senkung für wenig Erlösverzicht. | T ⚠️ / L ❌ | Siehe Top 2, 3, 6. „Monatsfront“, „ε-70“, „λ-Punkt“, „Löser-Artefakt“, „Rastet auf 18 vorgerechneten Front-Punkten“. Der Linkschart-Wert „0,30“ hat keine Einheit. | Hauptzahl in GW: „2,51 GW“ + „statt 0,37 GW nach reinem Preis“. Euro-Zeile als % zum Max.-Erlös. Fahrweisen: „Nur Preis“ / „Kompromiss“ / „Spitze zuerst“. Löser- und Analytik-Sätze in die Methodik. | A + B |
| Tageshorizont „An keinem Tag erreicht der Markt 70 Prozent“ | Auf Tagesbasis gibt es keine Win-win-Tage. | T ⚠️ / L ❌ | „Regel T“, „Konflikt-Hebung“, „Konflikt-schwach“, „Neutral“ sind unerklärt. | Legende in Klartext: „Konflikt-Hebung = Preisfahren hebt die Tagesspitze“. „Regel T“ streichen. | A |
| Beispieltage 21.10. / 29.10. | Konkrete Tage zeigen den Mechanismus. | T ✅ / L ⚠️ | „SoC-Rückkehr · Modellartefakt“ ist Jargon. | „23–24 Uhr: Modell füllt den Speicher auf 50 % zurück (kein echter Effekt)“. | A |
| Vertragsform „Leistungsdeckel statt Abendfenster“ | Ein Deckel wirkt, ein Zeitfenster nicht. | T ⚠️ / L ❌ | „fNAV“, „ε-Schnitt“, „Konvention (a)“. 2,41 GW vs. 2,51 GW Kompromiss werden nicht erklärt. | Klartext (siehe fixes_A). | A |
| Rechtsrahmen-Box | Einordnung. | T ✅ | „AgNesENTWURF“ (Chip ohne Abstand). BGH-Zeile „netzdienlich wirken kann“ (als Wiedergabe okay, besser in Anführungszeichen). | – | A |
| Mobil | – | – | Seite 401 px breit bei 390 px Viewport (horizontaler Überlauf). | CSS. | A |

### 8. `/methodik`

| Abschnitt | (1) | (2) | (3) | (4) | (5) |
|---|---|---|---|---|---|
| A1 Kurzfassung | Alle Annahmen auf einen Blick. | ❌ | Beschreibt das alte Tagesmodell („Laden vor 17 Uhr und Abgabe ab 17 Uhr“, „Testnetz SimBench“), nicht die heutigen Monats-/Simulator-Läufe (MIP, Vollvoraussicht, Spitze/Überschuss/Markt). | Neue Kurzfassung (fixes_A). | A |
| Kapitel C (15 Abschnitte) | Netz-Beispiele. | ⚠️ | Größtenteils Archiv von Seiten, die heute auf /simulator umleiten (Anschluss-Ampel, Ort-Archetypen, Ladepark, Szenarien). „Badge netzdienlich v1/v2“, „Einschätzung netzdienlich“ verstoßen gegen die Wortregel. | Kapitel C in „Archiv“ einklappen, umbenennen „Netzwirkung (Archiv)“. | A (Namen) + B (Gliederung) |
| D2 Glossar | Begriffe. | ✅ | Viele Begriffe der Seiten fehlen (ε-70, Kipppunkt, Restlast, Überschuss, NEP). | Ergänzen; Seiten verlinken auf Glossar-Anker. | A |

### 9. `/beitraege`, `/beitraege/<slug>`

| Abschnitt | (1) | (2) | (3) | (4) | (5) |
|---|---|---|---|---|---|
| Intro | Übersicht. | ⚠️ | „Veröffentlichen machen Sie selbst.“ | streichen | A |
| „Kontext aus den Daten“ (vor den Artikeln) | Datenkontext. | ⚠️ | Datenregeln vor dem eigentlichen Inhalt einer Leseseite. | Unter die Artikelliste oder streichen. | B |
| Artikel KW 46 | Wochenmeldungen + Einordnung. | T ✅ / L ✅ | Interne Dateipfade (Zeile 80), „Markt55,6 GW“, 18:00 vs. 18:30. | fixes_A | A |
| Extern gelesen | News. | ✅ | Photon-Headline, 23,7 GW (siehe Startseite). | fixes_A | A |

### 10. `/impressum`, `/datenschutz`
✅ Keine Verständnisprobleme gefunden.

---

## Zählung
- **A-Fixes:** 38 Einzeländerungen (in `fixes_A.md`, 18 Blöcke)
- **B-Themen:** 6 Strukturthemen (in `konzept_B.md`, je 2–3 Varianten) + 1 Grundsatzentscheidung (Euro bei ×2)
