# fixes_A – Text-, Label- und Zahlenkontext-Fixes (ein PR)

Repo-Stand: `016366a` (main). Zeilennummern beziehen sich auf diesen Stand. Alle Texte sind Deutsch. Englische `tx(...)`-Zweige bitte sinngemäß mitziehen.

Regeln für alle Fixes:
- kein „netzdienlich“ als eigene Wertung, kein „Netzanschlussprüfung“
- Euro nur bei ×1 als „Modellschätzung“
- jede Annahme mit Link auf /methodik
- Tests, die alte Strings prüfen, mit anpassen (genannt, wo bekannt)

Nach dem PR prüfen: `npm test`, dann alle Seiten bei 1280/390 neu rendern, dann `rg -n -i "netzdienlich" components lib app` (nur Zitate und Wiedergaben dürfen übrig bleiben).

---

## Block 1 · /tag „02 · Das System“ (Top 1)
**`components/home/TagSystemChapter.tsx`**

Z. 31–33 (`lead`)
- vorher: `"Im Überschuss-Lademodell ist an diesem Tag nichts zu laden."`
- nachher (Fall ohne Überschuss):
  `` `Die deutschen Großspeicher (${formatQuantity(fleetPowerGw, "de", 2)} GW / ${formatQuantity(fleetEnergyGwh, "de", 2)} GWh Kapazität, Battery Charts) hatten nichts aufzunehmen: Wind und Sonne lagen den ganzen Tag unter dem Verbrauch. Fahrweisen nach Preis oder gegen die Abendspitze rechnen wir bisher für Oktober (/monat/2026-10).` ``
- Fall mit Überschuss (Z. 32), vorher: `` `Bei ×1 hätte die Referenzflotte (${…} GW) einen großen Teil des Überschusses aufgenommen.` ``
  nachher: `` `Die heutige Flotte (${…} GW / ${…} GWh) hätte ${sharePct} % des Überschusses aus Wind und Sonne aufgenommen (Modell).` ``

Z. 40 (H2)
- vorher: `Speicher am {weekdayLabelDe(dayKey).replace(/\.$/, "")}` → rendert „Speicher am So, 15.11“
- nachher: `Speicher am {weekdayLabelDe(dayKey)}{hasSurplus ? "" : ": nichts geladen"}` → rendert „Speicher am So, 15.11.: nichts geladen“

Z. 45 (Kernzahl ohne Überschuss)
- vorher: `{formatQuantity(fleetEnergyGwh, "de", 2)} GWh` (= installierte Kapazität 8,27 GWh)
- nachher: `0 GWh geladen`

## Block 2 · /tag „01 · Der Tag“
**`components/home/TagChapter.tsx`**

Z. 34–37 (`kernSurplus`)
- vorher: `` `${…} GWh` `` / `"< 0,05 GWh"`
- nachher: `` `Überschuss: ${formatQuantity(surplusGwh, "de", 1)} GWh` `` / `"Überschuss: unter 0,05 GWh"`

Z. 39–40 (`lead`)
- vorher: `` `Abendspitze der Residuallast ${…} GW um ${peakAt} Uhr.` ``
- nachher, Fall ohne Überschuss: `` `Wind und Sonne lagen den ganzen Tag unter dem Verbrauch. Die Restlast (Verbrauch minus Wind und Sonne) erreichte ${…} GW um ${peakAt} Uhr.` ``
- Fall mit Überschuss: `` `Die Restlast erreichte abends ${…} GW um ${peakAt} Uhr.` ``

`PreisFenster` (Aufruf Z. 55–62): Titelzeile über dem Preisgraph ergänzen:
`Day-Ahead-Preis, €/MWh · Punkte: die günstigsten und teuersten Viertelstunden, in die die heutige Flotte passt`

## Block 3 · /tag Kopf
**`components/home/AuffaelligkeitKopf.tsx`**

Z. 76
- vorher: `` `Zuletzt Überschuss am ${weekdayLabelDe(lastSurplus.dateKey)} — nur die Überschuss-Kennzahl.` ``
- nachher: `` `Zuletzt lagen Wind und Sonne am ${weekdayLabelDe(lastSurplus.dateKey)} bundesweit über dem Verbrauch.` ``

Z. 77
- vorher: `"Unter der Überschuss-Schwelle."`
- nachher: `"Wind und Sonne blieben unter dem Verbrauch."`

## Block 4 · /tag/heute Preisvorschau (S1, falsche Spanne)
**`components/home/LiveTagPreisPanel.tsx`** Z. 231–236

- vorher: `tomorrowPrices[0]` … `bis` … `tomorrowPrices[tomorrowPrices.length - 1]`. Das sind der erste und der letzte Viertelstundenwert („206 bis 131“).
- nachher: `Math.min(...tomorrowPrices.map(p => p.eurPerMwh))` bis `Math.max(...)`. Text: `Preise morgen ({label}): {min} bis {max} €/MWh (Day-Ahead).`
- Den Link „Nur als Preisvorschau“ auf `/tag/${tomorrowKey}` entfernen (die Seite leitet um).

## Block 5 · Startseite Hero
**`components/research/ResearchHomeShell.client.tsx`**

Z. 45
- vorher: `Spitze bei ×{factor} · Modell · national`
- nachher: `Senkung der Tagesspitze mit ×{factor} (das {factor}-fache der heutigen Flotte) · Modell · national`

Z. 67
- vorher: `Restlast national · Fläche: gekappt (Modell) · 4-h-Geist: gestrichelt`
- nachher: `Restlast national · Fläche: was die Flotte abschneidet (Modell) · Linien: Spitze nach ×2 / ×5 / ×10 · grau gestrichelt: ×{factor} mit 4 h`

**`components/research/MesserHeroChart.tsx`**
- Z. 178–186 (4-h-Linie): direkt beschriften. `<text>` rechts mit „×{factor} · 4 h“.
- Z. 204–205: Inaktive Stufen `strokeDasharray="1 3"` (gepunktet), damit sie sich von der 4-h-Linie unterscheiden.

**`lib/research/loadResearchHome.server.ts`** Z. 63–64: H1 bleibt. Neue Zeile darunter als Begründung (neues Feld, Wert aus dem Modell):
`Die Abendspitze lag rund {dauerH} Stunden über der ×{factor}-Linie. Die Flotte hält volle Leistung nur 1,76 h.`
Gestern: ≈7 h über 19,1 GW. Die Zahl aus `model.day` rechnen, nicht hart codieren.

## Block 6 · Startseite Woche + Sättigung
**`lib/research/researchFormat.ts`**

Z. 74
- vorher: `` `DIESE WOCHE · ${range} · TAGESHORIZONT` ``
- nachher: `` `LETZTE 7 TAGE · ${range} · TAGESHORIZONT` ``

Z. 38
- vorher: `` `Letzte Woche hätte doppelt so viel Speicher die Tagesspitze jeden Tag um ${min} bis ${max} GW gesenkt.` ``
- nachher: `` `Mit doppelter Flotte (×2) wäre die Tagesspitze letzte Woche jeden Tag um ${min} bis ${max} GW gesunken.` ``

**`components/research/charts.tsx`** Z. 342, 348
- vorher: `` `${margA} je GW` `` / `` `${margB} je GW` ``
- nachher: `` `${margA} GW weniger Spitze je GW Speicher (×2→×5)` `` / `` `${margB} GW je GW (×5→×10)` ``

**`components/research/ResearchHomeShell.client.tsx`** Z. 117
- vorher: `Wolke: 365 Tage bis {…} · heutige Flotte · Tageshorizont`
- nachher: `Graue Punkte: jeder Tag der letzten 365 Tage bis {…} · rot: gestern · ×1 = heutige Flotte = 0`

## Block 7 · Simulator-Teaser (Startseite, /tag, Metadaten)
Gleicher Text an vier Stellen:
- `components/home/SimulatorTeasers.tsx` Z. 11 und Z. 31
- `components/research/ResearchHomeShell.client.tsx` Z. 129
- `app/simulator/page.tsx` Z. 15 (description)

- vorher: `70 Prozent der Monatssenkung kosten {costPctText} des Erlöses (ε-70)` + Sub `Flotte ×2, Modellschätzung, national, kein Netzengpass.`
- nachher H2: `Doppelte Flotte im Oktober: nach Preis 0,37 GW weniger Spitze, mit Rücksicht auf die Spitze 2,51 GW.`
- nachher Sub: `Dafür {costPctText} weniger Day-Ahead-Erlös. Modell, national, ohne Netzengpass.`
- Die GW-Werte aus `loadEps70Teaser()` mitliefern, nicht hart codieren.

## Block 8 · Startseite Fußnote Flottenstand
**`components/research/ResearchHomeShell.client.tsx`** (Fußnote „Flotte 4,64 GW / 8,15 GWh, Stand 31.10.“, Annahmen-Block)
- nachher: `Oktober-Rechnung mit Flotte 4,64 GW / 8,15 GWh (Battery Charts, Stand 31.10.). Heute: {live} GW / {live} GWh.`
- Gleiche Formel in `/methodik` A1 (Block 18).

## Block 9 · News
**`data/news.json`**
- Z. 9 (Einordnung Bundestag): `23,7 GW` → `23,8 GW` (Tageswert 23,79, /tag zeigt 23,8)
- Z. 25 (Headline Photon)
  - vorher: `Verteilnetzbetreiber schreibt netzdienlichen Speicher statt Netzausbau aus`
  - nachher: `Verteilnetzbetreiber schreibt Speicher mit vorgegebener Fahrweise statt Netzausbau aus`

Prüfen, ob die Einordnungs-Zahlen automatisch kommen. Wenn sie statisch sind, ist das eine Fehlerquelle; dann in B6 mit aufnehmen.

## Block 10 · Beiträge
- **`components/beitraege/BeitraegePage.tsx`** Z. 26: `„… — zum Lesen. Veröffentlichen machen Sie selbst.“` → `„Artikel von SpeicherPilot und ausgewählte Meldungen mit Einordnung.“`
- **`content/blog/netz-updates-kw-46.md`** Z. 80: die ganze Zeile `*Grafiken: Karte 5 (karten/05_beobachtung.png …) … Interaktiv auf …*` → `*Interaktiv: speicherpilot.app/monat/2026-10 und speicherpilot.app/simulator.*`
- **`components/blog/netz-updates/NetzUpdatesFahrweiseChart.tsx`** Z. 74: nach `; Markt` fehlt ein Leerzeichen (rendert „Markt55,6 GW“) → `; Markt{" "}`
- **`lib/netzUpdatesChartData.server.ts`** Z. 70: `i += 4` liest nur volle Stunden. Darum steht in der Bildunterschrift „beobachtet 54,3 GW um 18:00“, Fließtext und /simulator sagen 18:30. Fix: die Spitzen (observed/price/peak) über alle Viertelstunden suchen und nur für die Polylinie stündlich sampeln.

## Block 11 · /monat/2026-10 Regler
**`components/monat-regler/MonatReglerHero.client.tsx`**
- Z. 145: `Dauer: <strong>1,76 h</strong> aktiv · 2 h und 4 h ohne Zeitreihe — siehe Graph darunter.` → `Speicherdauer heute: <strong>1,76 h</strong>. Was längere Speicher (2 h, 4 h) bringen, zeigt „Es fehlen Stunden“ weiter unten.`
- Z. 160: `Δ zur Beobachtung` → `gegenüber gemessen (64,4 GW)` (Wert aus dem Modell)

## Block 12 · /monat/2026-10 Kapitel
**`components/monat-v1/MonatV1Charts.client.tsx`**
- Z. 626 `<h1 …>` → `<h2 …>` (die Seite hat sonst zwei H1).
- Z. 633 Kernzahl `{insightSpitzeX10Gw}` (50,4 GW, doppelt zum Hero) → `ab ×{kipppunkt}` („ab ×3,9“)
- Z. 635: `Spitze bei ×10 und Kipppunkt {…} — drei Fahrweisen auf derselben Restlast.` → `Ab etwa der {kipppunkt}-fachen Flotte erzeugt Laden nach Preis eine neue Monatsspitze (×10: 92,8 statt 64,4 GW gemessen). Gegen die Spitze gefahren sinkt sie auf 50,4 GW.`
- Z. 656: `{surplusPoolGwh} GWh` → `{surplusPoolGwh} GWh Überschuss im Oktober`
- Z. 658: `Der Aufnahme-Pool ist bei ×10 voll, die Spitzensenkung bleibt deutlich unter spitzenorientiertem Fahren.` → `So viel Wind- und Sonnenstrom lag im Oktober über dem Verbrauch. ×10 nimmt fast alles auf, senkt die Spitze damit aber nur um 7,7 GW. Gegen die Spitze gefahren sind es 14,0 GW.`

## Block 13 · Pflichtzeile (Modellgrenzen)
**`lib/monatReglerPflichtzeile.ts`** Z. 3 (Test `lib/monatReglerPflichtzeile.test.ts` mitziehen)
- vorher: `national, kein (n−1), nicht Abregelung; Markt = Stresstest ohne Preisrückwirkung`
- nachher: `Modell: Deutschland als ein Netzknoten, ohne Leitungsengpässe. „Markt“ fährt nach Day-Ahead-Preis, ohne dass Speicher den Preis verändern (Stresstest). Details: Methodik.`
- Die Zeile steht 4× pro Seite. Unter den Graphen nur „Modell · Annahmen unten“ zeigen, den vollen Satz einmal am Seitenende (Struktur in B5).

## Block 14 · /monat/2026-11 (laufender Monat)
- **`lib/monatPageData.server.ts`** Z. 74: `` `${…} · eingefrorene Tage` `` → `` `Daten bis ${letzterTag}` ``
- **`components/home/MonatPageV4.tsx`** Z. 128: `„Eingefrorener Beobachtungsstand. Modellflotte aus Oktober-Bundle.“` → `„Daten bis {letzterTag}. Für November gibt es noch keine Modellrechnung.“`
- **`lib/monatCalendar.ts`** Z. 229: `` `${n} Kalendertage fehlen in den Daten.` `` → fehlende Vergangenheitstage und Zukunft trennen: `` `Daten bis ${last}. ${k} Tage folgen noch, ${f} liegen in der Zukunft.` ``
- **`lib/dauerlinieChartLayout.ts`** Z. 137: Wenn kein Modelllauf vorliegt (`fleetAvailable === false`), statt `` `…: mit ${strategyLabel} ×${factor} liegt die Spitze bei ${gw} GW.` `` → `` `${cap} bis ${letzterTag}: höchste gemessene Restlast ${gw} GW.` `` (Aufrufer `components/home/MonatObservedOnlySlot.tsx` Z. 25–28)
- **`components/home/MonatObservedOnlySlot.tsx`** Z. 31: `Weiße Linie:` → `Linie:` (im Hellmodus ist sie schwarz)
- **`components/home/MonatPageV4.tsx`** Z. 122: Aufklapper `Klarstellung Beobachtungsgraph` → `Warum hier keine Balken stehen`

## Block 15 · Simulator: Wort „netzdienlich“ (Top 2, Regel)
Fahrweisen-Label „Netzdienlich“ → **„Spitze zuerst“**. „Max. Erlös“ → **„Nur Preis“**. „Kompromiss“ bleibt.
- `components/monat-v1/SimulatorParetoSection.client.tsx` Z. 109, 120, 159, 553, 584
- `lib/simulatorChartTooltip.ts` Z. 19, 67, 81 (+ `lib/simulatorChartTooltip.test.ts` Z. 50, 75)
- `components/monat-v1/SimulatorFnavSection.client.tsx` Z. 193, 220
- `components/monat-v1/SimulatorBeispieltageSection.client.tsx` Z. 51
- `SimulatorParetoSection.client.tsx` Z. 92: `<strong>netzdienlich = senkt die Monatsspitze, nicht jeden Tag.</strong>` → `<strong>„Spitze zuerst“ senkt die Monatsspitze so weit wie möglich, nicht jede Tagesspitze.</strong>`
- `components/methodik/MethodikMonatKonzept.tsx` Z. 83: `… nicht der Preis der Netzdienlichkeit.` → `… kein echter Preis für die Spitzensenkung.`
- `components/monat-v1/SimulatorLegalBox.tsx` (BGH-Zeile): `auch wenn der Speicher netzdienlich wirken kann` → `auch wenn der Speicher dem Netz nützen kann` (oder als Zitat in Anführungszeichen)

## Block 16 · Simulator: Kopf, Labels, Jargon
**`components/monat-v1/SimulatorFahrweisenWorkbench.client.tsx`** Z. 20
- vorher: `Mehr Gigawatt helfen. Mehr Stunden helfen mehr.`
- nachher: `Fahrweise schlägt Größe.`

**`components/monat-v1/SimulatorParetoSection.client.tsx`**
- Z. 55 Eyebrow: `Monatsfront · Monatsspitze, Oktober · Zusatzflotte ×2 (4,64 GW / 8,15 GWh)` → `Oktober 2026 · doppelte Flotte (×2): heute 4,64 GW + 4,64 GW zusätzlich`
- Z. 56–63 Hauptzahl/H2: `0,36 % / für 70 Prozent der Monatssenkung.` → Hauptzahl `2,51 GW`, H2 `weniger Oktober-Spitze, statt 0,37 GW bei reinem Preisfahren.`
- Z. 64–66 Lead: `Die volle Senkung kostet 0,30 von 34,09 Mio. €. Modellschätzung.` → `Dafür sinkt der Day-Ahead-Erlös um 0,36 %. Die volle Senkung (3,59 GW) kostet 0,89 %.` (Euro-Frage: siehe konzept_B D1)
- Z. 78: `Marktanteil` → `vom Max.-Erlös` (der Wert ist Erlös Kompromiss / Erlös Max., kein Marktanteil)
- Z. 167: Zeile „Ein reiner Spitzen-Löser liefert bei ×2 einen „Erlös“ von −3,08 Mio. € — Löser-Artefakt …“ aus der Tabelle entfernen (steht schon in Methodik)
- Z. 181: `Auswahl (λ-Punkt)` → `Ihre Auswahl`
- Z. 194: Satz `Analytisch: Restlast 21.10. 14:00 plus Voll-Laden ergibt 64 428 MW (Methodik).` entfernen (steht in Methodik)
- linkes Mini-Chart, Wert `0,30` → `0,30 Mio. €` bzw. `0,89 %` (je nach D1)

**`components/monat-v1/FrontSlider.tsx`** Z. 108: `Rastet auf {count} vorgerechneten Front-Punkten · Pfeiltasten` → `{count} vorberechnete Fahrweisen zwischen „Nur Preis“ und „Spitze zuerst“ · Pfeiltasten`

**`components/monat-v1/SimulatorTagesSection.client.tsx`**
- Z. 47: `Tageshorizont · Regel T · nicht die Monatsscheibe` → `Jeder Tag einzeln gerechnet`
- Z. 68 ff. Legende: `Konflikt-Hebung` → `Preisfahren hebt die Tagesspitze`, `Konflikt-schwach` → `kleiner Zielkonflikt`, `Neutral` → `kein Zielkonflikt`, `Win-win` → `beide Ziele zugleich`
- Z. 76: `… Regel T, SoC Start = Ende = 50 % …` → `… Speicher beginnt und endet jeden Tag halb voll …`
- `lib/simulatorChartTooltip.ts` Z. 33–34, 41: Labels wie oben

**`components/monat-v1/SimulatorBeispieltageSection.client.tsx`** Z. 308: `SoC-Rückkehr · Modellartefakt` → `23–24 Uhr: Modell füllt auf 50 % zurück (kein echter Effekt)`

**`components/monat-v1/SimulatorFnavSection.client.tsx`** Z. 29–30
- vorher: `fNAV-Zeitfenster 16–21 Uhr landet am Markt-Ende (0,37 GW). Der Leistungsdeckel 62 GW entspricht dem ε-Schnitt (2,41 GW Senkung).`
- nachher: `Eine flexible Anschlussvereinbarung, die nur das Zeitfenster 16–21 Uhr regelt, ändert nichts: 0,37 GW, wie bei reinem Preisfahren. Ein Deckel, der die Restlast bei 62 GW hält, schafft 2,41 GW, fast so viel wie der Kompromiss.`
- Legend `Zusatzflotte, Konvention (a)` → `×k = k-fache heutige Flotte`

**`components/monat-v1/SimulatorLegalBox.tsx`** Z. 21: Abstand zwischen `AgNes` und dem `ENTWURF`-Chip (rendert „AgNesENTWURF“)

**Mobil:** /simulator ist bei 390 px Viewport 401 px breit (horizontaler Überlauf). Verursacher suchen (vermutlich die Tabelle in `SimulatorParetoSection` oder die KPI-Reihe) und `overflow-x:auto` setzen. (CSS, klein.)

## Block 17 · /vision
**`components/research/VisionPage.tsx`**
- Z. 56–57 Intro: `Nationale Kupferplatte, Vollvoraussicht über zwölf Monate (Obergrenze). Spitzenorientiert heißt: …` → `NEP = Netzentwicklungsplan Strom. Seine Szenarien A, B und C erwarten 41, 68 und 94 GW Großspeicher. Wir setzen sie in das Stromsystem der letzten zwölf Monate: Deutschland als ein Netzknoten ohne Leitungsengpässe, mit perfekter Vorausschau. Das ist eine Obergrenze.`
- Z. 66: `Ab NEP A bringt jedes GW wenig` → `Ab NEP A (41 GW) bringt jedes weitere GW Speicher wenig`
- Z. 69–70: `Jahresspitze … · Vorjahr NEP C: −10,5 bis −13,4` (liest sich wie eine Spanne) → `Jahresspitze 73,0 GW (03.12.2025, 17:00). NEP C senkt sie um 13,4 GW (Vorjahreszeitraum: 10,5 GW).`
- x-Achse G1: Einheit `Speicherleistung, GW`. Sternchen bei `≥ 78 GW Zusagen*` auflösen (Fußnote: Quelle der Netzanschlusszusagen).

**`components/research/vision-jahr/VisionJahrG2Markt.tsx`** Z. 168: `Rückwirkung: OLS-Band b … 2b, nicht Prognose · …` → `Preisrückwirkung grob aus historischen Preisen geschätzt (Band: einfache bis doppelte Wirkung), keine Prognose · nur Day-Ahead, kein Intraday oder Regelenergie`

**`components/research/vision-jahr/VisionJahrG3Ueberschuss.tsx`** Z. 75: `Strich: nach Preis (Rückw. 2,86)` → `Strich: nach Preis, mit grober Preisrückwirkung`

**`components/research/vision-jahr/VisionJahrG4Tage.tsx`** Z. 82 und **`lib/research/visionG4Labels.ts`** Z. 37–38: `NEP C hält 59,6 GW` → `NEP C drückt die Spitze bis 59,6 GW`

## Block 18 · Methodik
**`components/methodik/MethodikUeberblick.tsx`** Z. 384 (A1 Kurzfassung, beschreibt ein altes Modell)
- vorher: `… nur Day-Ahead, Laden vor 17 Uhr und Abgabe ab 17 Uhr, Flotte ×1 = … Testnetz SimBench, kein reales Netz.`
- nachher: `Kurzfassung: Round-Trip 85 % (Spanne 80–90 %), nutzbarer Ladezustand 10–90 %, Preisnehmer (Speicher ändern den Preis nicht), nur Day-Ahead, Deutschland als ein Netzknoten. Tagesseite: Überschuss-Modell (lädt nur, wenn Wind und Sonne über dem Verbrauch liegen). Monat und Simulator: drei Fahrweisen (gegen die Spitze, Überschuss, nach Preis) mit voller Vorausschau. Flotte ×1 = heutige Großspeicher (Battery Charts). Oktober-Rechnung: 4,64 GW / 8,15 GWh, Stand 31.10. Tagesseiten: aktueller Stand.`

**`components/methodik/methodikSections.ts`**
- Z. 24: `Badge netzdienlich v1, Standort, Szenarien und Testnetz (n-1).` → `Netzwirkung am Standort, Szenarien und Testnetz (Archiv).`
- Z. 52: `Einschätzung netzdienlich` → `Einschätzung Netzwirkung (Archiv)`
- Z. 61: `Badge netzdienlich v2` → `Netzwirkung-Kennzeichen v2 (Archiv)`
- Folgestellen: `components/site/SiteDay.tsx:833`, `components/site/SitePlanner.tsx:970`, `components/site/SiteProposalDocument.tsx:113`, `components/PerspectiveChoice.tsx:19`. Prüfen, ob sie noch erreichbar sind (alle /site- und /ort-Routen leiten um). Wenn ja, gleich umbenennen.

Glossar (`lib/glossary.ts`): Einträge ergänzen für Restlast, Überschuss (national), Kipppunkt, Kompromiss (70 % der Senkung), NEP A/B/C, Preisrückwirkung, „×k“.

---

## Zählung
38 Einzeländerungen in 18 Blöcken (inkl. 1 kleiner CSS-Fix und 2 kleiner Logikfixes: Min/Max-Preis, Viertelstunden-Peak). Alles ohne Layout-Umbau.
