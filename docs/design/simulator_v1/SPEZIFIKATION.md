# SpeicherPilot · Simulator der Fahrweisen · Vorentwurf v1 · Spezifikation

Stand 12.11.2026, 11:20 MEZ · design · kein Bau, kein PR · Grundlage: `konzept_simulator_fahrweisen_v1.md`, `simulator_rechnung_v1/ergebnis.md` Abschnitt „Was der Bau-Brief an sites enthalten muss“, `pareto_voll.json` / `pareto_punkte.csv`, `graphs/`. Designsystem: `/monat`-v1-SPEZIFIKATION plus `/tag`-Kanten aus PR 98. Zahlen aus der Rechnung, keine Platzhalter.

**Ort:** Werkbank auf `/monat` (Oktober 2026), Tagesstreifen und Beispieltage als Übergang zu `/tag`. **Kein neuer Navigationspunkt.**

**Messlatte:** Die Kernfrage — wie viel Senkung für wie viel Erlösvorzicht, und ob die Front eine Schulter hat — ist mobil in 5 Sekunden ablesbar. H1 und Display nennen 0,36 % für 70 % der Monatssenkung; die volle Achse zeigt, dass 0,30 Mio. € in 34,09 liegen; der Zoom (ab 653 px, erste Falte 844) zeigt Schulter, 70-Prozent-Linie und die lexikographischen Endpunkte.

---

## 1. Reihenfolge der Abschnitte

1. Header 56 px: Wortmarke „SpeicherPilot“ (Space Grotesk 600, 16). Nav unverändert — Gestern, Vision, Tag, **Monat** (aktuell, 2 px Rost-Unterstrich), Ort, Methodik, Beiträge. Mobil nur „Monat“. Kein Punkt „Simulator“.
2. Kicker „FAHRWEISEN · OKTOBER 2026 · MONATSHORIZONT“ (JetBrains 12, Caps, Tracking 0,08 em, muted) + Chip **MODELL** (1 px Rahmen `--ink` als Hex `#101214` / `#E9EEF2`, Radius 4 px).
3. **Kernantwort 1 — Monatsfront (Hero).** Maßstabskicker „Monatsfront · Monatsspitze, Oktober · Zusatzflotte ×2 (4,64 GW / 8,15 GWh)“. Display „0,36 %“, H1, Lead, Insight (3 Zahlen), **Volle Achse + Zoom** (Zoomfenster markiert), Schieber, Figcaption, Wertezeile.
4. **Kernantwort 2 — Tagesstreifen.** Maßstabskicker „Tageshorizont · Regel T · nicht die Monatsscheibe“. H2, Lead, Legende, 31-Tage-Streifen, Figcaption, zwei 44-px-Links auf `/tag/2026-10-21` und `/tag/2026-10-29`.
5. **Kernantwort 3 — Beispieltage 21.10. und 29.10.** Kicker „Tageshorizont · Übergang zu /tag“. H2, Lead, Legende, zwei Tageskurven (Restlast + drei Fahrpläne + Preisspur), Figcaption.
6. **Kernantwort 4 — fNAV und Kipppunkt.** Kicker „Vertragsform · stilisiert · national“. H2, Lead, drei Karten (Zeitfenster / Deckel 62 GW / Deckel 64,41 GW), Kipppunkt-Graph, Figcaption.
7. **Rechtsrahmen** als Methodikkasten.
8. Footer: Quelle, Konvention (a), Flottenbasis, Modellvorbehalt.

Unter jedem Graph wörtlich: `national, kein Netzengpass, Vollvoraussicht · Modell`.

---

## 2. Typografie, Raster, Tokens (Hex, nie Kanäle)

Kanten aus PR 98, eine Token-Quelle:

```css
:root {
  --bg: #F6F6F3; --ink: #101214; --muted: #43474C;
  --linie: #DADAD3; --flaeche: #FFFFFF; --gridline: #E4E4DC;
  --rust: #B4532A;
  --rust-tint: rgba(180, 83, 42, 0.10);
  --page-max: 1248px;          /* 12×74 + 11×24 + 2×48 */
  --page-gutter: 20px;         /* < 768 */
  --type-12: 0.75rem; --type-14: 0.875rem; --type-16: 1rem;
  --type-18: 1.125rem; --type-24: 1.5rem; --type-32: 2rem;
  --type-48: 3rem; --type-display: 3.5rem; /* 56 */
}
@media (min-width: 768px) { :root { --page-gutter: 48px; } }
.dark {
  --bg: #0B0D0F; --ink: #E9EEF2; --muted: #9EA3A9;
  --linie: #262B31; --flaeche: #121417; --gridline: #1F2529;
  --rust: #B4532A;             /* nur Grafik, niemals Text (Dunkel 3,90:1) */
  --rust-tint: rgba(180, 83, 42, 0.20);
}
```

**Lehre aus PR #99 (Pflicht):** Alle Linienfarben und Textfarben in SVG als **Hex hell/dunkel**, nicht `var(--foreground)` und nicht `var(--muted-foreground)`. Diese Tokens sind im Theme HSL-Kanäle ohne `hsl()`; als `stroke` sind sie ungültig, Polylinen verschwinden, Kreise bleiben (Default-Fill). `--ink` und `--muted` in dieser Spezifikation sind Hex und dürfen in CSS stehen; in SVG-Attributen trotzdem die Hex-Werte aus der Tabelle „Linienfarben“ einsetzen. Dark-Override explizit, kein Fallback über eine gesetzte ungültige Variable.

| Rolle | 390 | 768 | 1280 | Schrift | Token |
|---|---|---|---|---|---|
| Display (0,36 %) | 40 / 0,95 / 500 | 40 | 56 / 0,95 / 500 | Space Grotesk, tnum | `--type-display` (mobil 2,5 rem) |
| H1 | 32 / 1,15 / 600 | 32 | 48 / 1,15 / 600 | Space Grotesk, `text-wrap: balance`, max 18 ch | `--type-32` / `--type-48` |
| H2 | 24 / 1,2 / 600 | 24 | 32 / 1,2 / 600 | Space Grotesk, max 22 ch | `--type-24` / `--type-32` |
| Lead | 16 / 1,55 / 400 | 16 | 18 / 1,55 / 400 | Space Grotesk, max 52 ch | `--type-16` / `--type-18` |
| Insight-Zahl | 24 / 500 | 24 | 32 / 500 | JetBrains tnum | `--type-24` / `--type-32` |
| Body (Rechtsrahmen, Karten) | 16 / 1,55 | 16 | 16 | Space Grotesk | `--type-16` |
| Achsen, Labels, Tabelle, Figcaption, Chip, Kicker | **≥ 12 nach Skalierung**, nie darunter | ≥ 12 | ≥ 12 | JetBrains tnum | `--type-12` |
| Nav-Wortmarke | 16 / 600 | 16 | 16 | Space Grotesk | `--type-16` |

**Linke Kante (PR 98):** 390 → 20 (Inhalt 350). 768–1247 → 48. 1280 → 64 (Offset 16 + Gutter 48, Inhalt **1152**, `page-max` 1248). 1440 → Kante 144, Inhalt 1152.

**H1 wörtlich**, festes Umbruch, geschütztes Leerzeichen wo nötig:

```
0,36 %                          ← Display
für 70 Prozent                  ← H1 Zeile 1
der Monatssenkung.              ← H1 Zeile 2 (`<br />`, `text-wrap: balance`)
```

Lead: „Die volle Senkung kostet 0,30 von 34,09 Mio. €. Modellschätzung, Endpunkte lexikographisch.“

H2 wörtlich: „An keinem Tag erreicht der Markt 70 Prozent.“ · „Am 21.10. lädt der Markt mittags. Am 29.10. liegt der Preis eine Stunde vor der Spitze.“ · „Was wirkt, ist ein Leistungsdeckel — nicht das Abendfenster.“

Zahlen: Dezimalkomma, NBSP (U+00A0) vor der Einheit, echtes Minus (U+2212), Malzeichen × (U+00D7). `font-variant-numeric: tabular-nums`. Kein Kursiv. Euro nur bei ×2, immer mit „Modellschätzung“.

---

## 3. Kontrast (aus /monat-v1, unverändert)

| Paar | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `#101214` auf `#F6F6F3` | 17,34 : 1 | — | Text, Netzdienlich-Linie, Front |
| `#E9EEF2` auf `#0B0D0F` | — | 16,67 : 1 | Text, Netzdienlich, Front (dunkel) |
| `#43474C` auf `#F6F6F3` | 8,64 : 1 | — | Sekundärtext, Achsen, beobachtet |
| `#9EA3A9` auf `#0B0D0F` | — | 7,66 : 1 | Sekundärtext, Achsen (dunkel) |
| `#B4532A` auf `#F6F6F3` | 4,61 : 1 | — | Markt-Linie, Punkte (Grafik). Text in Rost nur hell, wo 4,61 reicht — dieser Entwurf setzt **allen Text auf Ink** |
| `#B4532A` auf `#0B0D0F` | — | 3,90 : 1 | **nur Grafik**, niemals Text |

Grafik gegen Fläche ≥ 3 : 1. 70/70-Feld: `rgba(27,107,69,0.10)` hell, `rgba(90,180,140,0.12)` dunkel (Fläche, kein Text).

---

## 4. Lehre aus PR #99 — Viewbox, Labels, Linien

### 4.1 Viewbox-Wechsel

| Containerbreite | Layout | Viewbox-Breite (Hero-Zoom) | Skalierung bei 12-px-Schrift |
|---|---|---|---|
| &lt; 1100 px (390, 768, 1024) | Mobil-Layout | 350 | 390: 350/350 = 1, 12 px bleiben 12. 768: Inhalt 672, Skala 672/350 ≈ 1,92, Schrift **23 px** (≥ 12). 1024 ähnlich. |
| ≥ 1100 px (1280) | Desktop-Layout | Zoom 868, voll 260, kombinierte Breite 1152 | 1 : 1, 12 px bleiben 12. |

**Nicht** bei 720 auf die 1152-Viewbox wechseln (PR 99: 12 px wurden auf 768 zu ≈ 7,5 px). Schwelle **1100**. 768 verwendet die 350-Viewbox, Koordinaten identisch zur 390-Tabelle, nur größer angezeigt.

Keine Labels außerhalb der Viewbox. Endlabels am letzten / zugehörigen Punkt, nicht an einer festen Ecke. Zweizeilige Labels: Zeilenabstand **18 px** (12-px-Glyphe hat ≈ 16 px Box; 14 px führt zu 2-px-Überlappung). Knockout-Rechteck `fill` Flächenfarbe, Deckkraft 0,90, hinter der Schrift, vor der Linie.

### 4.2 Kollisionsregeln (alle Graphen)

1. Mindestabstand zwischen Label-Boxen **8 px**. Unter 8 px: ausweichen.
2. Ausweichreihenfolge: zuerst vertikal weg von der Linie (Name über, Wert unter, oder beide unter bei Engpass oben), dann horizontal zur freien Seite.
3. Priorität (nicht verschieben, andere weichen aus): lexikographische Endpunkte → Kompromiss → 70-Prozent-Linie → Annotations (SoC, beobachtet) → Achsenticks.
4. Achsenursprung: y-Tick „0“ weglassen, wenn er den ersten x-Tick überdeckt (Zoom: y-Ticks 2, 4 mobil; 1–4 desktop).
5. Rotierte Achsentitel vermeiden (getBBox und Clip). Titel waagerecht oben: „Senkung, GW“, „Monatsspitze, GW“.
6. Klemmen: Label-Box mit 4 px Abstand innerhalb der Viewbox. `text-anchor="end"` am rechten Rand, `"start"` am linken, niemals Mitte auf dem ersten/letzten Balken, wenn die Box austritt.

### 4.3 Linienfarben Hex

| Element | Hell | Dunkel | Stärke |
|---|---|---|---|
| Pareto-Front, Netzdienlich-Linie | `#101214` | `#E9EEF2` | 2,5 px, rund |
| Beobachtete Restlast | `#43474C` | `#9EA3A9` | 1,5 px |
| Kompromiss-Restlast | `#101214` / `#E9EEF2` | dieselben | 1,75 px, Dash `6 4` |
| Max. Erlös (Markt) | `#B4532A` | `#B4532A` | 2,25 px; ab ×3,9 Dash `7 5` |
| Raster | `#E4E4DC` | `#1F2529` | 1 px |
| Achse | wie Ink | wie Ink | 1,25 px |
| 70-%-Linie (Zoom, Streifen) | `#43474C` | `#9EA3A9` | 1 px, Dash `5 4` |
| Auswahlring am Schieber-Punkt | `#B4532A` | `#B4532A` | 2,25 px, r = 11, fill none |
| Markt-Punkt | `#B4532A` gefüllt | `#B4532A` | r = 6 |
| Netz- / Kompromiss-Punkt | Ink gefüllt | Ink | r = 6 |
| Zwischenpunkte der Front | Fläche, Stroke Ink | Fläche, Stroke Ink | r = 3, Stroke 1,25 |

Schraffur Markt ab ×3,9 und SoC-Band 23–24 Uhr: Pattern 7×7, 45°, Rost bzw. muted 1,25 / 0,9 px, **hinter** der Linie.

---

## 5. Graph 1 — Monatsfront (Hero)

**Eine Satz-Aussage:** Die Front klebt oben rechts: 70 % der Monatssenkung (2,51 GW) kosten 0,36 % des Erlöses (33,97 von 34,09 Mio. €, Modellschätzung); die volle Senkung kostet 0,30 Mio. € (0,89 %).

**Zwei Ansichten, immer zusammen:** Volle x-Achse 0–36 Mio. €, y 0–4,2 GW, **und** Zoom 33,70–34,18 Mio. €, dieselbe y-Achse. 0,30 Mio. € nie ohne den Kontext 34,09. Das Zoomfenster auf der vollen Achse ist exakt 33,70–34,18 (ein schmaler Streifen rechts, Rost-Tint + 1,5-px-Rahmen) — die Schmalheit *ist* die Aussage. 70/70-Feld: ab 23,86 Mio. € und 2,51 GW (grünliche Fläche). Die gesamte Front liegt rechts der 70-Prozent-Erlösgrenze (≥ 99 %).

Endpunkte **lexikographisch**, beschriftet „lex.“ auf 1280: Max. Erlös dann min. Spitze (34,09 / 0,37 / 64,04), min. Spitze dann max. Erlös (33,79 / 3,59 / 60,82). Ohne das zweite Ziel wäre der Netz-„Erlös“ −3,08 Mio. € — steht in der Wertezeile, nicht als Frontpunkt.

**Kompromiss (Default):** ε-Schnitt 70 % = 33,97 Mio. € (99,64 %), 2,51 GW, 61,89 GW.

### 5.1 Viewbox und Ränder

| | 390 / 768 | 1280 |
|---|---|---|
| Volle Achse | 350×120, L/R/T/B = 38/16/16/36, Plot 296×70 | 260×360, 40/14/32/52, Plot 208×278 |
| Zoom | 350×300, 48/18/26/54, Plot 284×222 | 868×360, 52/36/32/54, Plot 780×274 |
| Anordnung | Gestapelt: voll oben, Zoom darunter | Nebeneinander, 24 px Abstand |
| Mobil-Ticks voll | x: 0, 20, 34. y: 0, 4 | x: 0, 10, 20, 30, 34. y: 0, 1, 2, 3, 4 |
| Mobil-Ticks Zoom | x: 33,7, 33,9, 34,1. y: 2, 4 und **2,51** (70 %) | x: 33,70 … 34,10 in 0,10. y: 1–4 und **2,51** |

### 5.2 Label-Tabelle Hero-Zoom (Anker am Punkt)

Koordinaten in Viewbox-Einheiten. `P` = Punktposition aus der Datenreihe (x = Erlös, y = Senkung), gemappt auf den Plot.

| Label | 390 / 768 | 1280 | Anker | Regel |
|---|---|---|---|---|
| Netzdienlich · lex. + 33,79 · 3,59 GW | `x = P.x + 10`, `y = P.y − 20` und `+ 18`, start. Zweizeilig | `x = P.x + 12`, `y = P.y − 4` und `+ 18`, start. Zeile 1 „Netzdienlich  ·  lex.“ | start | Rechts vom linken oberen Endpunkt. Nicht oben links in der Ecke (PR 99). |
| Kompromiss + 33,97 · 2,51 GW | `x = P.x − 10`, `y = P.y + 22` und `+ 40`, **end** (start würde die 350-Box verlassen) | `x = P.x + 12`, `y = P.y + 16` und `+ 34`, start | end mobil, start 1280 | Unter dem Punkt, klar unter der 70-Prozent-Beschriftung (links auf der Linie). |
| Max. Erlös · lex. + 34,09 · 0,37 GW | `x = P.x − 10`, `y = P.y − 6` und `+ 12`, end | `x = P.x − 12`, `y = P.y − 8` und `+ 10`, end. Zeile 1 mit „lex.“ | end | Links/oberhalb des rechten unteren Endpunkts, in der Box. |
| 70 % der max. Senkung | Links innen, `x = L + 8`, `y = fy − 10`, start, Knockout | `x = L + 10`, `y = fy − 10`, voller Wortlaut | start | Auf der Horizontalen bei 2,51 GW, nicht auf dem Kompromiss-Punkt. |
| „volle Senkung kostet 0,30 Mio. € (0,89 %)“ | **nicht im Zoom** (steht auf der vollen Achse: „0,30 von 34,09 · Zoom“, oben rechts) | Oben zwischen Netz-x und Markt-x, Klammer, Knockout, 12 / 500 | middle | |
| Achsentitel | „Senkung, GW“ oben links waagerecht; unten „Day-Ahead-Erlös, Mio. €  ·  Modellschätzung“ | „Zoom 33,70–34,18  ·  Senkung in GW“ | | Nicht rotiert. |

Volle Achse, 390: oben links „Volle Achse“, oben rechts „0,30 von 34,09  ·  Zoom“. 1280: „Volle Achse“ links, „Zoom“ am Fensterrand (`x = wx1 − 6`, `y = T − 6`, end), darunter „0,30“.

### 5.3 Schieber

Rastet auf den **18 vorgerechneten Front-Punkten** (beide lex-Endpunkte, ε-50/70/90, eindeutige Dichotomie-Punkte). Kein Live-LP.

Drei benannte Positionen, 44 px min. Höhe und Breite, Raster 1fr 1fr 1fr:

| Name | Index (0-basiert, nach Senkung sortiert) | Erlös | Senkung |
|---|---|---|---|
| Max. Erlös | 0 | 34,09 Mio. € | 0,37 GW |
| Kompromiss (Default) | 8 (ε-70) | 33,97 Mio. € | 2,51 GW |
| Netzdienlich | 17 | 33,79 Mio. € | 3,59 GW |

`input[type=range]`: Höhe 44 px, Thumb 44×44, Track 2 px Ink. Zwischen-Ticks 8 px muted, benannte 12 px Ink. Tastatur: Pfeiltasten (nativer Range, Schritt 1).

`aria-valuetext`-Muster: „Kompromiss: 33,97 Millionen Euro Modellschätzung, Senkung 2,51 Gigawatt“. Analog für die anderen Punkte („Maximaler Erlös“, „Netzdienlich“, sonst „Frontpunkt“). `aria-valuemin=0`, `valuemax=17`, `valuenow` = Index.

Der ausgewählte Punkt trägt den Rost-Ring (r = 11). Insight und Wertezeile folgen dem Zustand. Reihenfolge auf der Seite: Insight, **dann die Graphen**, dann der Schieber (damit Zoom und Schulter in der ersten Falte liegen: Zoom beginnt mobil bei 653 px, 70-Prozent-Linie und Kompromiss bei ≈ 768, Falte 844; Markt-Punkt knapp darunter).

### 5.4 Wertezeile

Nur untere Haarlinie, kein Vollraster (Lehre #99). Ausgewählte Zeile `font-weight: 500`.

| Fahrweise | Erlös (Modellschätzung) | Senkung | Spitze |
|---|---|---|---|
| Max. Erlös | 34,09 Mio. € | 0,37 GW | 64,04 GW |
| Kompromiss | 33,97 Mio. € (99,64 %) | 2,51 GW | 61,89 GW |
| Netzdienlich | 33,79 Mio. € | 3,59 GW | 60,82 GW |

Darunter der Satz zum Löser-Artefakt (−3,08 Mio. € ohne Lexikographie).

---

## 6. Graph 2 — Tagesstreifen, Regel T

**Eine Satz-Aussage:** 0 Win-win-Tage im Oktober; Maximum 46 % am 06.10.; der 29.10. (Monatsspitze) erreicht 10 % bei höchstem Tageserlös (2,11 Mio. €, Modellschätzung).

Kein Text „viele Tage sind Win-win“. Die 70-Prozent-Schwelle bleibt die Definition. Klassen nach **Regel T**, **Tageshorizont**, SoC Start = Ende = 50 %. Die Monatsscheibe des Monatsfahrplans ist nicht die Farbgrundlage (erzeugt 17 falsche Win-win-Tage).

| Klasse | Farbe hell | dunkel | Anzahl | Höhe |
|---|---|---|---|---|
| Win-win | `#1B6B45` | `#6FBF93` | 0 (nur Legende) | — |
| Neutral | `#D5D5CD` | `#2A2E32` | 18 | share ΔM/ΔN, 0–1 |
| Konflikt-schwach | `#C9A46A` | `#8B5A1A` | 11 | wie oben |
| Konflikt-Hebung | `#B4532A` | `#B4532A` | 2 (21.10., 25.10.) | nach unten (negative Senkung) |

Linien 70 % und 30 % gestrichelt. Viewbox 390: 350×250, L/R = 16. 1280: 1152×200, L/R = 16.

| Label | 390 / 768 | 1280 | Anker |
|---|---|---|---|
| 70 %, 30 % | Rechts auf der Linie, `x = L + plotW`, end, 500 / 400 | ebenso | end, **innen** (nicht plotW+4 — das tritt aus) |
| 06.10.  46 % | Über dem Balken, Mitte | ebenso; 03.10. 41 % dazu | middle |
| 21.10. hebt 1,31 GW | Unter der Null-Linie (Hebung nach unten) | ebenso | middle |
| 29.10.  10 % | **Oben rechts** im T-Rand (`y = 16`, `x = VW − R`, end), nicht auf 70/30 | Über dem Balken, end wenn nah am Rand | end mobil |
| Tageszahlen | 01, 06, 10, 15, 21, 25, 31. 01 start am ersten Balken, 31 end am letzten. 29 entfällt (steht in der Annotation) | ungerade Tage, dieselben Anker-Regeln | |

Der Streifen selbst ist visuell (31 Balken, Breite ≈ 9–33 px — unter 44). **Tippen:** zwei Karten darunter, min-height 44 px, Links nach `/tag`. Nicht jeder Tag ein 44-px-Ziel auf 390.

---

## 7. Graph 3 — 21.10. und 29.10.

**Eine Satz-Aussage:** Am 21.10. erzeugt Marktladen um 14:00 eine neue Tagesspitze 55,60 GW (beobachtet 54,30 um 18:30); am 29.10. liegt das Preismaximum (574 €/MWh, 17:15) eine Stunde vor der Restlastspitze (64,41 GW, 18:15), der Markt hat nur noch 0,83 GW übrig.

Gleiche y-Achse **20–70 GW** auf beiden Tagen: 55,60 bleibt sichtbar unter 64,41; dasselbe Laden überschreitet die Monatsspitze ab ×3,9. 1280 zwei Spalten (je 560), 390 gestapelt (350), 21.10. zuerst.

Linien: beobachtet muted 1,5; Max. Erlös Rost 2,25; Netzdienlich Ink 2; Kompromiss Ink gestrichelt 1,75. Lade-Fläche des **Markt**-Fahrplans in Rost-Tint (die Geschichte); Entladen Ink-Tint. SoC-Band 23–24 Uhr schraffiert, Beschriftung **in der Preisspur** unten, end-Anker links von 23:00: „SoC-Rückkehr  ·  Modellartefakt“ — nicht als Netzeffekt, nicht oben in der Residual (dort sitzen 60–64 GW).

Stunden nur auf der Preisspur (00 start, 24 end). Keine zweite Stundenzeile unter der Residual (Kollision im Spalt). Preis-Ticks 0 und 200 (21.10.) bzw. 0 und 300 (29.10.) — 574 ist Ereignis, kein Tick. „€/MWh“ oben an der Preisspur, nicht in der Stundenzeile.

| Label | 390 / 768 | 1280 |
|---|---|---|
| 21.10. neue Spitze 55,60 GW / lädt 4,64 GW · 14:00 | Zwei Zeilen, 18 px, **end**, `x = x(14:00) − 8`, über der Spitze, Knockout, in der Box | ebenso |
| 21.10. beobachtet 54,30 · 18:30 | end, unter der Linie, `x(18:30) − 4` | ebenso |
| 21.10. Netzdienlich 51,68 | end, `x = L + plotW − 2`, **tiefer** (`y + 22`) | end, `x = x(23:00) − 8`, `y + 28` (unter beobachtet, vor dem SoC-Band) |
| 29.10. 64,41 | Kurz links auf der gestrichelten Monatsspitzen-Linie (`L + 6`) | voll „Monatsspitze 64,41“ |
| 29.10. Markt: 0,83 GW übrig | end bei `x(18:15) − 6`, `y(64,41) + 28` (unter der Spitze, vor 23:00) | ebenso |
| 29.10. Netzdienlich 60,82 | start bei `x(08:00)`, `y(60,82) − 10` (Vormittag, über der Linie) | zusätzlich „· 16:45–19:00“ |
| 29.10. 574 € · 17:15 | end, in der Preisspur, `x(17:15) − 8`, unter dem Punkt | „574 €/MWh  ·  17:15“ |

Am 21.10. kostet der Tages-Kompromiss 13 % des Tageserlöses (0,56 statt 0,65 Mio. €) — im Lead, Maßstab gegen die Monatsfront.

---

## 8. Graph 4 — fNAV und Kipppunkt

**Eine Satz-Aussage:** Das Abend-Entnahmeverbot landet am Markt-Ende (0,37 GW, wie Max. Erlös); was wirkt, ist ein Leistungsdeckel auf die Restlast nach Speicher (62 GW → 2,41 GW bei 33,98 Mio. €, 99,7 %); die neue Monatsspitze beginnt unter dem Markt-Fahrplan bei ×3,9 (Preisnehmer, keine Euro für ×5/×10).

Drei Karten, kein 4-Spalten-Raster auf 390 (Overflow). 1280 ein Dreier-Grid.

| Form | Erlös (Modellschätzung) | Senkung | Lesart |
|---|---|---|---|
| Zeitfenster 16–21 Uhr | 34,00 Mio. € | 0,37 GW | Identisch mit Max. Erlös — wirkt nicht. Verhindert das Mittagsladen 21.10. 14:00 nicht. |
| Leistungsdeckel 62 GW | 33,98 Mio. € · 99,7 % | 2,41 GW | Der ε-Schnitt, den der Schieber schon erzeugt. Die Vertragsform. |
| Deckel 64,41 GW („keine neue Spitze“) | ändert ×2 nicht | 0,37 GW bleibt | Begrenzt ×5/×10 auf 64,41 GW, ohne selbst zu senken. |

Kipppunkt-Graph: x = ×1 … ×10 (Konvention a), y = Monatsspitze 40–100 GW. Markt durchgezogen bis ×3,8 (64,04 GW, 29.10.), ab **×3,9** gestrichelt und Fläche darüber schraffiert (64,43 GW, 21.10. 14:00). Netzdienlich fällt: ×2 60,82, ×5 54,99, ×10 **50,43**. Markt ×10 **92,76** (nicht 92,72). **Keine Euro-Zahl.** Beobachtet 64,41 als Tick und Linie. x-Ticks: 1, 2, 3, **3,9**, 5, 10 — **ohne ×4** (kollidiert mit ×3,9). y mobil: 40, 60, 80, 100 plus 64,41; desktop dazu 50, 70, 90. Viewbox 390: 350×320, L = 52 (damit „64,41“ als end-Tick bei `L − 8` in der Box bleibt). 1280: 560×340, L = 52.

| Label | 390 / 768 | 1280 | Anker |
|---|---|---|---|
| Max. Erlös 92,76 GW | Zwei Zeilen, end, am Punkt ×10 / 92,76, 18 px | eine Zeile, end, `x(10) − 8`, `y − 8` | end, **am letzten Punkt** |
| Netzdienlich 50,43 GW | Zwei Zeilen, end, am Punkt ×10 / 50,43, unter der Linie | eine Zeile, end, `y + 16` | end |
| neue Spitze ab ×3,9 | Zwei Zeilen bei `x(3,9) + 8`, `y(80)`, start, nicht auf 64,41 | „neue Spitze ab ×3,9“ und „64,43 GW  ·  21.10. 14:00“, start, `y(64,43) − 12` / `+ 8` | start |
| 64,41 beobachtet | `L + 6`, `y(64,41) − 10`, muted | „beobachtet 64,41“, start | start |
| „Preisnehmer, keine Euro-Zahl für ×5/×10“ | — (steht in der Figcaption) | oben rechts, muted, end | end |

---

## 9. Rechtsrahmen (Methodikkasten)

Titel: „Die Front zeigt den Preis. Sie zahlt ihn nicht.“ Fläche, 1-px-Rahmen Linie, kein Warn-Gelb. Je eine Zeile:

- **§ 118 Abs. 6 EnWG** — IBN bis 4.8.2029: 20 Jahre keine Netzentgelte auf den Bezug. Heute fehlt das laufende Entgelt-Signal.
- **§ 17 Abs. 2b EnWG** — Flexible Netzanschlussvereinbarung (Höhe, Zeit). Angebot, keine Pflicht. Rahmen für den Leistungsdeckel.
- **BGH EnVR 1/24** — BKZ nach Leistungspreis zulässig, auch wenn der Speicher netzdienlich wirken kann. Steuert die Anschlussgröße, nicht den Fahrplan.
- **AgNes** mit Chip **ENTWURF** — Konsultation abgeschlossen, am 12.11.2026 kein festgelegtes Recht. Kein AgNes-Tarif in diesem Modell.
- **§ 14a EnWG** — Gilt nicht für diese Flotte (nicht Niederspannung).

Fuß: „Kein Rechtsrat.“ Redispatch ist Eingriff, keine Planfahrweise. §§ 11a/11b nur Hinweis, kein Modus in v1.

---

## 10. Inhaltliche Regeln (nicht verhandelbar)

- **Modell** sichtbar (Chip + Figcaption).
- Euro **nur bei ×2**, wörtlich „Modellschätzung“. Keine Euro-Zahl für ×5/×10, keine Marktlinie als Prognose ab dem Kipppunkt (Stresstest, schraffiert, Preisnehmer).
- Fußzeile und Figcaption: `national, kein Netzengpass, Vollvoraussicht · Modell`.
- Deutsche Typografie (Abschn. 2).
- Zwei Maßstäbe **getrennt beschriftet**: Graph 1 = Monatsfront; Graph 2 und 3 = Tageshorizont, Regel T.
- Endpunkte lexikographisch.
- fNAV in v1 = Leistungsdeckel (ε-Schnitt). Zeitfenster 16–21 Uhr nur Vergleich am Markt-Ende, nicht als wirksamen Kompromiss verkaufen.
- Kipppunkt ≈ **×3,9**. ×10: netzdienlich 50,43 GW, Markt 92,76 GW.
- SoC-Rückkehr 23–24 Uhr schraffiert und als Modellartefakt beschriftet.
- Flottenbasis 4,64 GW / 8,15 GWh, Konvention (a), ×1 = beobachtete 64,41 GW.
- Die Front zeigt den Preis, sie zahlt ihn nicht.
- 31-Tage-Streifen: 0 Win-win, 18 / 11 / 2. Beispieltage 21.10. und 29.10. Bester Anteil 46 % (06.10.) ist kein Win-win.

---

## 11. Barriere und Bewegung

- Tippen ≥ 44 px: Schieber-Thumb, drei Namens-Tasten, Tages-Links, Chip (Höhe 24, umliegende Fläche). Der 31-Tage-Streifen ist visuell; Interaktion über die zwei Tageskarten.
- Tastatur: Pfeile auf dem Range, Tab auf Tasten und Links.
- `aria-valuetext` s. 5.3. Jedes SVG `role="img"` mit `aria-label`. Wertezeile als Tabelle (Alternative zum Graph).
- Fokusring Rost 2 px. `prefers-reduced-motion`: keine notwendige Bewegung im Vorentwurf (statische Zustände).
- `scrollWidth === clientWidth` auf 390 und 1280, hell und dunkel (gemessen).
- CLS: feste Viewbox-Höhen, keine webfont-ohne-display-block (Fonts `font-display: block` im Vorentwurf).

---

## 12. Erste Falte (gemessen, Kompromiss, Hell)

| | 390 (844) | 1280 (800) |
|---|---|---|
| Display + H1 + Lead + Insight | 172–521 | 142–496 |
| Volle Achse | 529–649, vollständig | 512–872 (neben Zoom) |
| Zoom | ab 653, bis 953. In der Falte: Schulter, 70-Prozent-Linie, Netzdienlich, Kompromiss (≈ 768). Max.-Erlös-Punkt knapp darunter (≈ 881) | ab 512, Front vollständig, x-Achsen-Titel knapp unter 800 |
| Schieber | 957–1085, unter den Graphen (bewusst, damit die Schulter in der Falte liegt) | 880–992 |
| Wertezeile | darunter, zulässig | darunter |

---

## 13. Dateien

```
design_simulator_v1/
  SPEZIFIKATION.md          diese Datei
  src/data.py               Zahlen und Reihen aus simulator_rechnung_v1
  src/gen.py                HTML/SVG-Skizzen
  src/render.py             Playwright, erst scrollen, dann Full-Page + Falte
  src/*.html                erzeugte Skizzen
  seite_{390,1280}_{light,dark}.png
  seite_{390,1280}_{light,dark}_falte.png
  g1_hero_{390,1280}_{light,dark}.png
  schieber_{erloes,kompromiss,netz}_{390,1280}_light.png
  uebersicht.png            1280 hell, alle Module
```

Selbst-QA: `scrollWidth === clientWidth` auf allen 19 PNGs; Schrift ≥ 12 px nach Skalierung; SVG-`getBBox`-Prüfung ohne Austritt und ohne Überlappung (letzte Runde, 390 und 1280 hell, alle Graphen sauber). Kontrast aus der Tabelle. Tippen 44 px im CSS.

---

## 14. Offene Fragen und Risiken

1. **Reihenfolge auf `/monat` gegen die Flottenkurven (PR 99, nicht gemergt).** Dieser Vorentwurf ist die Werkbank „Fahrweisen“ als Kapitel. Ob sie vor, nach oder anstelle der ×1…×10-Kurven steht, entscheidet der Bau — nicht hier.
2. **Default „Kompromiss“ = ε-70** (H3-Definition), nicht ein λ-Knie. Das sichtbare Knie der Grenzkosten liegt in der Nähe; ein anderer Default braucht ein GO.
3. **Preisrückwirkung** kann den Kipppunkt ×3,9 verschieben oder auflösen. Marktlinie ab ×3,9 bleibt Stresstest.
4. **Andere Monate**, besonders winterliche, langgezogene Lastspitzen, sind nicht gerechnet. Der günstige Monats-Kompromiss ist an „eine Spitze, wenige Stunden“ gebunden.
5. **Zielfunktion „Summe der Tagesspitzen“** wäre eine teurere Front. Wer „netzdienlich“ als „jeder Tag sinkt“ liest, bekommt das vom Monatslöser nicht — deshalb die getrennte Beschriftung der Maßstäbe.
6. AgNes-Tenor, BK8-Ausgleich, VDE-AR-N 4110/4120: unverändert nicht am Text geprüft. Örtliche fNAV aus öffentlichen Daten nicht ableitbar.
7. Der Schieber in diesem Vorentwurf ist in drei statischen Zuständen gezeigt. Die Produktion verdrahtet ihn auf die JSON-Frontpunkte.

**Für den Bau:** diesen Aufbau, diese Zahlen, Schieber auf vorgelegten Punkten, volle Achse plus Zoom, zwei Maßstäbe, fNAV als Deckel, Hex-Farben, Viewbox-Schwelle 1100, Label-Tabellen pro Breite.
