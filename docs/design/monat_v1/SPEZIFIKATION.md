# SpeicherPilot /monat · Vorentwurf v1 · Spezifikation

Stand 12.11.2026 · design · kein Bau, kein PR · Grundlage: `konzept_monat_v1.md`, Kernantworten 1, 3 und 4 (Antwort 2 und die volle Marktlinie nicht). Schrift Space Grotesk + JetBrains Mono, Tokens `--type-*` aus dem aktuellen Build (`sp-ro` / `sp-pr65`), Rost nur `#B4532A`.

**Alle Zahlen in den Graphen sind Platzhalter.** Die ×k-Konvention ist seit 12.11. auf Variante (a) festgelegt (×k = k-mal die heutige Flotte insgesamt, ×1 = Ist-Zustand). Die Beispielwerte stammen aus der alten Zählung (k-mal zusätzlich) in konzept_monat_v1 und werden vor dem Bau neu gerechnet. Im Entwurf sichtbar gekennzeichnet durch Chip „Beispielwerte“, Figcaption und Tabellen-Caption.

---

## 1. Reihenfolge der Abschnitte

1. Header 56 px: Wortmarke „SpeicherPilot“ links (Space Grotesk 600, `--type-16`), rechts „MONAT“ (JetBrains 500, `--type-12`, Caps, Tracking `--tracking-caps`, 2 px Rost-Unterstrich).
2. Eyebrow: „MONATSHORIZONT · OKTOBER 2026“ + Chip **MODELL** (sichtbar, 1 px Rahmen `--ink`, Radius 4 px) + Chip **BEISPIELWERTE**.
3. Eine Zeile Hinweis: „Vorentwurf · Zahlen sind Platzhalter und werden neu gerechnet.“
4. **Kernantwort 1 (Hero).** H1, Lead, Insight-Zeile, Graph, Figcaption, Wertezeile (Tabelle).
5. **Kernantwort 3.** H2, Lead, Legende, Graph, Figcaption, Wertezeile.
6. **Kernantwort 4.** H2, Lead, Graph (Balken inkl. Vergleich), Figcaption. Keine zweite Tabelle — die Balken sind die Wertezeile.
7. Footer: Quelle, Konventionshinweis, Modellvorbehalt.

Unter jedem Graph wörtlich: `national, kein Netzengpass, Vollvoraussicht · Modell · Beispielwerte`.

Antwort 2 (Mittagsspitze 21.10.) kommt nicht vor. Die Marktlinie beginnt erst ab ×3.

---

## 2. Typografie und Tokens

```css
:root {
  --bg: #F6F6F3; --ink: #101214; --muted: #43474C; /* 210 8% 28% */
  --linie: #DADAD3; --flaeche: #FFFFFF; --gridline: #E4E4DC;
  --rust: #B4532A;
  --rust-tint: rgba(180, 83, 42, .10);
  --type-12: 0.75rem; --type-14: 0.875rem; --type-16: 1rem;
  --type-18: 1.125rem; --type-24: 1.5rem; --type-32: 2rem;
  --type-48: 3rem; --type-display: 3.5rem;
  --lh-body: 1.55; --lh-heading: 1.15; --lh-tight: 1.1; --lh-meta: 1.5;
  --weight-regular: 400; --weight-medium: 500; --weight-semibold: 600;
  --tracking-caps: .08em; --tracking-headline: -.03em; --tracking-title: -.02em;
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem; --space-4: 1rem;
  --space-5: 1.25rem; --space-6: 1.5rem; --space-8: 2rem; --space-12: 3rem;
}
.dark {
  --bg: #0B0D0F; --ink: #E9EEF2; --muted: #9EA3A9; /* 210 6% 64% */
  --linie: #262B31; --flaeche: #121417; --gridline: #1F2529;
  --rust: #B4532A; /* derselbe Ton, nur für Grafik, nicht für Text */
  --rust-tint: rgba(180, 83, 42, .20);
}
```

| Rolle | 390 | 1280 | Schrift | Token |
|---|---|---|---|---|
| H1 Hero | 32 / 1,15 / 600 | 48 / 1,15 / 600 | Space Grotesk | `--type-32` / `--type-48` |
| H2 Abschnitte | 24 / 600 | 32 / 600 | Space Grotesk | `--type-24` / `--type-32` |
| Lead | 16 / 1,55 / 400 | 18 / 1,55 / 400 | Space Grotesk, max 52 ch | `--type-16` / `--type-18` |
| Insight-Zahl | 24 / 500 | 32 / 500 | JetBrains tnum | `--type-24` / `--type-32` |
| Achsen, Labels, Tabelle, Figcaption, Chip | ≥ 12, nie darunter | ≥ 12 | JetBrains tnum | `--type-12` |
| Nav-Wortmarke | 16 / 600 | 16 / 600 | Space Grotesk | `--type-16` |

Zahlen: Dezimalkomma, NBSP (U+00A0) vor der Einheit, echtes Minus (U+2212), Malzeichen × (U+00D7). `font-variant-numeric: tabular-nums`. Kein kursiv.

H1 wörtlich, mit festem Umbruch:

> Dieselbe Flotte senkt die Spitze<br>oder hebt sie.

H2 wörtlich: „Es fehlen Stunden, nicht Gigawatt.“ und „Überschuss allein trägt nicht.“

---

## 3. Kontrast (gemessen)

| Paar | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--ink` auf `--bg` | 17,34 : 1 | 16,67 : 1 | Text, Spitze-Linie |
| `--muted` auf `--bg` | 8,64 : 1 | 7,66 : 1 | Sekundärtext, Achsen, Überschuss-Linie |
| `#B4532A` auf `--bg` | **4,61 : 1** | **3,90 : 1** | Hell: Linie und Text möglich. Dunkel: **nur Grafik** (≥ 3 : 1), Labels in `--ink` |
| `#B4532A` auf `--flaeche` | 4,99 : 1 | 3,70 : 1 | wie oben |
| Prozentzahl `--bg` auf Balken `--ink` | 17,34 : 1 | 16,67 : 1 | „42 %“, „voll“ |

Rasterlinien `--gridline` sind Dekor (Kontrast < 3) und tragen keine Aussage. Datenstriche ≥ 2 px, Kontrast ≥ 3 : 1.

---

## 4. Graph 1 — Hero: höchste Restlast

**Frage in 5 s:** Eine Linie fällt, eine steigt über die Referenz.

### Maße

| | 390 | 1280 |
|---|---|---|
| Seitenrand (Wrap) | 20 | 64 |
| SVG Viewbox | 0 0 350 348 | 0 0 1152 460 |
| Plot-Ränder L / R / T / B | 38 / 26 / 24 / 54 | 52 / 188 / 32 / 62 |
| Plot innen | 286 × 270 | 912 × 366 |

Rechtes Margin 390 ist 26 px, damit „×10“ und „46“ nicht angeschnitten werden. Auf 1280 sitzen die Endlabels (Spitze, Überschuss, Markt) rechts außerhalb des Plots im 188-px-Rand.

### Achsen

- **x** linear, ×1 … ×10. Ticks und Beschriftung: `×1`, `×2`, `×3`, `×5`, `×10`. ×3 in Weight 500 (Beginn der Schraffur). Unterzeile in GW, Platzhalter: `4,6` / `9,3` / `13,9` / `23` / `46` (Basis 4,64 GW). Auf 1280 steht „GW“ hinter der letzten Unterzeile.
- **y** linear, **40–100 GW**, kein Log. Ticks 390: 40, 60, 80, 100. Ticks 1280: 40, 50, 60, 70, 80, 90, 100. Zusätzlich Tick **64,4** in `--ink` 500. Einheit „GW“ oben an der Achse.
- **Dieser y-Bereich hängt an den Platzhalter-Marktwerten** (×10 ≈ 96,8 GW, alte Konvention, ohne Preisrückwirkung). Nach Neurechnung und Rückwirkungslauf neu festlegen.

### Geometrie und Beschriftungen (wörtlich)

- Referenzlinie bei **64,4 GW**, 1,25 px `--ink`, durchgezogen. Label **„Oktober, beobachtet“**: 1280 eine Zeile links über der Linie; 390 zwei Zeilen (`Oktober,` / `beobachtet`) links über der Linie, klar über dem ×3-Marker.
- Fläche über der Referenz: `--rust-tint` über die volle Plotbreite. Label **„neue Spitze“** oben im Ton, `--muted`, 12 px. **Kein Endwert** in dieser Fläche.
- **Spitze:** 2,5 px `--ink`, durchgezogen, Punkte an ×1/×2/×5/×10 (gefüllt). Endlabel **„Spitze“**. Polylinie nur durch die gerechneten Stufen, keine erfundenen Zwischenläufe.
- **Überschuss:** 2 px `--muted`, durchgezogen, hohle Punkte. Endlabel **„Überschuss“**.
- **Markt ab ×3**, nicht davor (keine volle Marktlinie). 2,25 px `--rust`, `stroke-dasharray: 7 5`, `linecap: butt`. Startpunkt ×3 als hohler Rost-Kreis. **Kein Punkt und keine Zahl am Ende.** Label **„Markt“** und **„ohne Preisrückwirkung“** (1280 eine Zeile rechts; 390 zwei Zeilen links der Linie bei ≈ 90 GW, mit Knockout).
- Schraffur: Fläche zwischen Marktlinie und Referenz, ab ×3.

```svg
<pattern id="hatch-markt" width="7" height="7"
         patternUnits="userSpaceOnUse"
         patternTransform="rotate(45)">
  <line x1="0" y1="0" x2="0" y2="7"
        stroke="#B4532A" stroke-width="1.25"/>
</pattern>
```

### Insight-Zeile (über dem Graph, fest, kein Tooltip)

| links | rechts |
|---|---|
| **49,8 GW** | **ab ×3** |
| Spitze · ×10 · fällt | Markt über 64,4 GW, ohne Preisrückwirkung |

Keine Marktzahl für ×5/×10.

### Wertezeile (Tabelle unter dem Graph)

| Fahrweise | ×1 | ×10 |
|---|---|---|
| Spitze | 60,9 GW | 49,8 GW |
| Überschuss | 62,2 GW | 56,5 GW |
| Markt | 64,0 GW — 33,5 Mio € Modellschätzung | — ohne Preisrückwirkung |

Euro **nur bei ×1**, wörtlich **„Modellschätzung“**. Caption der Tabelle wiederholt die Regel (Platzhalter, kein ×5/×10-Marktwert).

Beispielwerte der Kurve (alte Konvention, nur Form): Spitze 60,86 / 58,80 / 54,06 / 49,77; Überschuss 62,16 / 60,86 / 58,37 / 56,50; Markt ab ×3: 64,70 … 96,76 (unbeschriftet). Beobachtet 64,41, angezeigt 64,4.

---

## 5. Graph 3 — Stunden, nicht Gigawatt

**Frage in 5 s:** Der 4-h-Punkt liegt an jeder Stufe deutlich höher; ×5 mit 4 h senkt mehr als ×10 mit 1,76 h.

### Maße

| | 390 | 1280 |
|---|---|---|
| SVG Viewbox | 0 0 350 320 | 0 0 1152 400 |
| Plot-Ränder L / R / T / B | 38 / 10 / 28 / 44 | 52 / 24 / 36 / 48 |

### Achsen

- **x** kategorial, nicht linear in k: `×1` / `×2` / `×5` / `×10`, gleiche Abstände. Unterzeile `4,6 GW` / `9,3 GW` / `23 GW` / `46 GW`.
- **y** linear, Spitzensenkung 0–20 GW. Ticks 0, 5, 10, 15, 20. Einheit „GW“ oben. (Nicht mit der Absolutchse von Graph 1 verwechseln.)

### Geometrie

Je Stufe ein vertikaler Steg (`--linie`, 2 px) und drei Punkte, horizontal um ±10 px (390) bzw. ±12 px (1280) versetzt, damit 1,76 h und 2 h sich nicht decken:

| Dauer | Zeichen | Farbe | Radius |
|---|---|---|---|
| 1,76 h | gefüllt | `--ink` | 4 |
| 2 h | hohl | `--muted`, Stroke 1,75 | 4 |
| 4 h | gefüllt | `--rust` | 6 |

HTML-Legende über dem Graph, dieselben Zeichen, 12 px, Tap-freie Beschriftung.

Wertlabels direkt: alle 4-h-Punkte (`−4,64 GW` … `−18,31 GW`) und der 1,76-h-Punkt bei ×10 (`−14,78 GW`). Auf 1280 verbindet eine gestrichelte Linie ×5·4 h mit ×10·1,76 h, Label **„mehr als“**.

### Wertezeile

Hervorhebung (`--rust-tint`) auf den zwei Vergleichszellen.

| Stufe | 1,76 h | 2 h | 4 h |
|---|---|---|---|
| ×1 | −3,59 GW | −3,92 GW | −4,64 GW |
| ×2 | −5,68 GW | −6,23 GW | −9,29 GW |
| ×5 | −10,43 GW | −11,10 GW | **−15,56 GW** |
| ×10 | **−14,78 GW** | −15,56 GW | −18,31 GW |

Platzhalter. 2-h- und ×2-Werte aus derselben Nachrechnung wie die Konzeptzahlen (Basis 4,644/8,152, alte Konvention).

---

## 6. Graph 4 — Überschuss allein trägt nicht

**Frage in 5 s:** Der Balken ist bei ×10 voll, die Spitze kaum tiefer — der Vergleichsbalken „spitzenorientiert“ ist fast doppelt so lang.

### Maße

| | 390 | 1280 |
|---|---|---|
| SVG Viewbox | 0 0 350 404 | 0 0 1152 384 |
| Pool-Balkenbreite | 200 | 520 |
| Zeilenhöhe | 52 | 56 |
| Balkenhöhe | 18 | 18 |

Vier Zeilen ×1 / ×2 / ×5 / ×10, danach ein Vergleichsblock nur für ×10, eigene Skala 0–16 GW.

### Beschriftungen und Werte (Platzhalter)

Kopf: **„Pool 134,2 GWh“** links, **„sinkt um“** rechts.

| Stufe | Füllung | Label im Balken | Spitze sinkt um |
|---|---|---|---|
| ×1 | 42 % | `42 %` | −2,24 GW |
| ×2 | 61 % | `61 %` | −3,55 GW |
| ×5 | 84 % | `84 %` | −6,03 GW |
| ×10 | 100 % | **`voll`** | −7,91 GW |

Füllung `--ink` auf Spur `--linie`. Prozent *in* der Füllung, sobald die Breite reicht, Farbe `--bg` (Kontrast ≥ 16 : 1).

Vergleichsblock, wörtlich:

- Überschrift: **„Bei ×10, zum Vergleich“**
- Balken 1, `--muted`: **„Überschuss“** — −7,91 GW
- Balken 2, `--ink`: **„dieselbe Flotte, spitzenorientiert“** — −14,63 GW

Gleiche Skala, gleiche linke Kante — der Längenunterschied ist die Aussage. Auf 1280 zusätzlich eine schmale Senkungs-Sparkline (0–16 GW) rechts neben jeder Stufenzeile; auf 390 entfällt sie (Platz).

---

## 7. Responsive Verhalten

- Zuerst 390, dann 1280. Dieselbe vertikale Reihenfolge, keine Nebeneinanderstellung der Kernantworten (jede Frage braucht den vollen Blick).
- 390: Endlabels *im* Plot, mit Knockout (`fill: var(--bg)`, 85–88 % Deckkraft). 1280: Endlabels rechts außerhalb.
- Insight, Wertezeile und Figcaption sind fest im Layout (Höhe reserviert). **Kein Tooltip, kein Hover über der Kurve.** Kein CLS durch nachgeladene Maße: SVG hat explizites `width`/`height`/`viewBox`, Schrift `font-display: block` bzw. lokal vorgeladen.
- Erste Mobile-Falte (~844 px): H1, Insight und der Hero-Plot (Fall gegen Anstieg über die Referenz) sind sichtbar. Die x-Achse und die Wertezeile liegen knapp darunter — ein kurzer Scroll, die 5-Sekunden-Aussage steht bereits im Plot.
- Tap-Ziele: der Header ist 56 px; es gibt keine interaktiven Chips oder Segment-Steuerungen unter 44 px. Der Vorentwurf ist statisch.

---

## 8. Barrierefreiheit

- Jedes SVG: `role="img"`, `<title>` und `<desc>` (deutsche Beschreibung der Aussage, inkl. Hinweis Platzhalter). `aria-labelledby` auf Title und Desc.
- Graph 1 und 3: HTML-`<table>` unter dem Graph ist die Tabellen-Alternative (gleiche Zahlen, Caption mit Regel). Graph 4: die beschrifteten Balken selbst, plus Vergleichsblock.
- „Modell“ ist als Chip und in jeder Figcaption sichtbar.
- Rost auf Dunkel nie als Textfarbe (3,90 : 1).
- `prefers-reduced-motion`: der Vorentwurf ist statisch; beim Bau gilt: Seitenübergang Hell/Dunkel sofort, keine Animation.

---

## 9. Dateien

Quelle und Generator: `src/gen.py`, `src/render.py`. HTML-Skizzen in `src/`. PNGs (Playwright, Device-Scale 2, erst scrollen dann Full-Page; `scrollWidth == clientWidth`, keine Labels < 12 px):

| Datei | Inhalt |
|---|---|
| `g1_hero_390_light.png` / `_dark.png` | Graph 1, 390 |
| `g1_hero_1280_light.png` / `_dark.png` | Graph 1, 1280 |
| `g3_stunden_390_light.png` / `_dark.png` | Graph 3, 390 |
| `g3_stunden_1280_light.png` / `_dark.png` | Graph 3, 1280 |
| `g4_ueberschuss_390_light.png` / `_dark.png` | Graph 4, 390 |
| `g4_ueberschuss_1280_light.png` / `_dark.png` | Graph 4, 1280 |
| `seite_390_light.png` / `_dark.png` | Ganzseite |
| `seite_1280_light.png` / `_dark.png` | Ganzseite |
| `uebersicht.png` | 1280 hell, alle drei Graphen |

---

## 10. Offene Fragen und Risiken

1. **y-Bereich Hero 40–100 GW** ist auf die Platzhalter-Marktlinie (bis 96,8, alte Konvention, Preisnehmer ohne Rückwirkung) geschnitten. Nach Konvention (a) startet ×1 am Ist (64,4) für alle Fahrweisen, und der Rückwirkungslauf (H3) kann die Marktlinie deutlich flacher machen. Dann die y-Achse neu wählen — sonst bleibt oben leerer „Stresstest-Raum“, oder die Linie läuft nicht mehr in die getönte Fläche.
2. **Alle Zahlen neu rechnen** auf Basis 4,64 GW / 8,15 GWh und Konvention (a), bevor gebaut wird. Konzept-Nachtrag 12.11. 09:25. In der alten Zählung ist ×10 Spitze 49,77 GW (−14,6); neu eher in der Größenordnung −14,0 (Vision-Nachrechnung v3). Die *Form* (Sättigung, 4 h höher, Pool voll / Spitze halb) soll halten, die Labels nicht.
3. Kleine Abweichungen in den Quellen: Konzept −14,78 / −14,63 / Bisektion, Repo 4,58/8,00 gegen battery-charts 4,64/8,15. Vor dem Bau eine Zahlreihe festlegen.
4. 2-h-Werte stehen nicht in den Kernantworten; sie sind aus derselben Nachrechnung ergänzt und als Platzhalter markiert. 1,76 h und 2 h liegen eng (Dodge ist Pflicht).
5. Mobil sitzt „beobachtet“ links dicht am ×3-Marker — Abstand nach Neurechnung (wenn der Kipppunkt wandert) erneut prüfen.
6. Euro 33,5 Mio € ist die Modellschätzung Markt ×1 aus Review A; nur dort zeigen, nicht skalieren.

**Für den Bau:** diesen Aufbau, Marktlinie erst ab ×3 schraffiert und ohne Endzahl, Werte fest unter dem Graph. Vorher neu rechnen.
