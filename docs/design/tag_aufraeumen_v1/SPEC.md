# /tag Aufräum-Vorentwurf — Spezifikation

Stand 12.11.2026. Inhalt und Konzept unverändert. Kein Bau, kein PR.
Live-Ist gemessen an https://www.speicherpilot.app/tag/2026-11-09
(Chromium, 1280 und 390, hell und dunkel; erst Scroll-Reveal, dann Full-Page;
scrollWidth = Viewport, kein Overflow). WebKit war installiert, die Host-Libs
für Safari-Engine fehlten — siehe Risiken.

Tokens aus `/workspace/sp-ro/app/globals.css` (Stand 12.11):
`--type-12` … `--type-display`, `--bg #F6F6F3` / `--ink #101214`,
dunkel `#0B0D0F` / `#E9EEF2`, Rost `--v4-warm #B4532A`,
Space Grotesk + JetBrains Mono, `--space-1`…`--space-12`.

Inject-CSS (Mockup, mit `!important`): `src/tag_aufraeumen.css`.
Im Bau die Regeln ohne `!important` in globals bzw. ins CSS-Modul schreiben.

---

## 1. Ist-Befund (gemessen, ergänzt die drei Punkte von sites)

### 1.1 Vier linke Kanten statt einer (1280)

| Kante | px | Wo |
|---|---|---|
| Header / Logo (Box) | 20–32 | `header > div` max 1360, `padding` 32; Lockup hat extra 12 px Pad |
| Fußnote Kap. 01 | **44** | `.v4-content.v4-footnote` kombiniert `padding-inline: 44` mit `max-width: 68ch` (612 px) auf demselben Element — der Container schrumpft, der Text rutscht 20 px nach links |
| **Hauptkante** | **64** | `.v4-content`: max 1240, zentriert (Offset 20) + Pad 44. Kopf, H1, H2, Kernzahl, Nacht/Mittag/Abend (Ziffern), Kap. 02/03 |
| details-Text | **81** | nativer Dreieck-Marker schiebt den Summary-Text ~17 px nach rechts |
| Markt-Insights | **84** | CSS-Modul `.block`: `max-width: 1200` + eigenes `padding: 16px 44px` *zusätzlich* zu `.v4-content` |
| Legal-Footer | **72** | `footer > div` max 1200, `md:px-8` (32) — dritte Breite |

Nacht/Mittag/Abend selbst sitzt auf 64 (Ziffern); der *wahrgenommene* Versatz kommt von der Fußnote darüber (44) und von Markt-Insights darunter (84).

### 1.2 390: Markt-Insights klebt am Rand

Unter 640 px setzt das Modul `padding: 12px 0` und überschreibt die 20 px von `.v4-content`.
Gemessen: Markt-Titel und -Text bei **textLeft = 0**. Alle anderen Blöcke bei 20.
Disclosure-Texte bei 35–37 (nativer Marker).

### 1.3 Größensprünge

| Element | Ist 1280 | Ist 390 | Ursache |
|---|---|---|---|
| H1 (Seitenkopf) | 48 | 29,25 | `--type-48`, fluid unter 768. Bleibt. |
| **H2** „Speicher am Mo…“, „Was am 09.11…“, „Hätte dieser Tag…“ | **48** | **28** | Spätere Regel `.v4-chapter-h2 { font-size: var(--type-48) }` überschreibt die erste (`clamp(18, 2.5vw, 24)`). H2 = H1, keine Hierarchie |
| **Kernzahl** „8,26 GWh“ | **96** | **52** | `.v4-tag-kern { clamp(3.25rem, 9vw, 6rem) }`; zusätzlich `.v4-system-pct { clamp(140px, 16vw, 190px) }` (an Überschusstagen würde das greifen) |
| Fließtext daneben | **14 px Grau** (`--muted-foreground`, rgb(66,71,77)) | 14 | `.v4-tag-side` |
| Hero-Zahl „439,9“ | **248** | 88 | `--type-riesenzahl`. Nicht Gegenstand der drei Befunde; Ausnahme, siehe Skala |
| details summary | 16, Höhe **21–24**, natives Dreieck | gleich | `.v4-tag-system-footnote` hat **keine** eigenen Styles |

Kontrast der Grau-Fließtexte im Ist ≥ 4,5:1 (kein Sample darunter). Das Problem ist der *Sprung* 96-neben-14, nicht der Kontrast allein.

---

## 2. Ein Spaltenraster

Eine Token-Quelle, eine Kante, für `/tag` und `/monat`.

```css
:root {
  --page-max: 1248px;       /* 12×74 + 11×24 + 2×48 */
  --page-gutter: 20px;      /* < 768, 4er-System */
  --grid-cols: 4;
  --grid-gutter: 16px;
}
@media (min-width: 768px) {
  :root {
    --page-gutter: 48px;    /* 8er; 44 war keins */
    --grid-cols: 12;
    --grid-gutter: 24px;
  }
}
```

Anwendung auf **jedes** äußere Wrapping-Element (Header-Inner, `.v4-content`,
`footer > div.mx-auto`, Markt-Insights — **ohne** zweites Padding, **ohne**
zweites `max-width`):

```css
.v4-content,
.site-header > div,
footer.border-t > div {
  max-width: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-gutter);
  box-sizing: border-box;
  width: 100%;
}
```

### Kante je Breakpoint

| Viewport | Offset | Gutter | **Linke Kante** | Inhaltsbreite | Spalten |
|---|---|---|---|---|---|
| 390 | 0 | 20 | **20** | 350 | 4 × 75,5 + 3 × 16 |
| 768–1247 | 0 | 48 | **48** | vw − 96 | 12, Gutter 24 |
| **1280** | 16 | 48 | **64** | **1152** | **12 × 74 + 11 × 24** |
| 1440 | 96 | 48 | 144 | 1152 | wie 1280 |

Bei 1280 ist die Inhaltsbreite bewusst **identisch** zum Ist (1240 − 2×44 = 1152).
Die bereits korrekten Blöcke wandern nicht. Nur die Ausreißer (44, 84, 72, 0) kommen auf 64 bzw. 20.

Fußnote: `max-width: 68ch` gilt für die **innere** Textzeile, nie für den Container.

```css
.v4-content.v4-footnote { max-width: var(--page-max); } /* wie alle */
.v4-footnote p { max-width: 68ch; }
```

Markt-Insights: das CSS-Modul (`MarktInsightsBlock.module.css`) muss
`max-width: 1200` und das Extra-Padding (desktop *und* `padding: 12px 0` unter 640) verlieren.
Der Block behält nur noch `.v4-content` plus `padding-block` und `border-top`.

### Ausnahmen (begründet)

1. **Chart-Innere** (Achsenbeschriftung, Peak-Label „68,4 GW“): dürfen gegenüber der Kante weiter einrücken — der Plot braucht Platz. Der *Frame* (`.v4-luecke-wrap`, Preis-Fenster-Container) bleibt auf der Kante.
2. **Nacht/Mittag/Abend-Ziffern** stehen auf der Kante; Titel/Body in einer 40-px-Spalte (8er) daneben. Das ist Raster, kein Versatz des Blocks.
3. **Tag-Navigation** „← Vortag“: Text sitzt ~4 px innerhalb (Button-Pad). Hit-Area und Container auf der Kante. Stehen lassen.
4. **Header-Wortmarke**: Lockup-Box beginnt durch eigenes 12-px-Pad knapp vor der Kante, die Glyphe sitzt auf 64. Nicht kompensieren.
5. **Hero-Riesenzahl** und der rechts stehende Mini-Chart: bleiben das zweispaltige Kopf-Layout; beide Spalten starten im Raster.
6. **Zentrierte Haupt-Nav** im Header: nicht kantengebunden.

---

## 3. Eine Größenskala — sechs Stufen

Bestehende `--type-*` Tokens, konsolidiert. `--type-14` fällt auf `/tag` und `/monat` als Stufe weg (Fußnote und Side werden Body 16). `--type-32` ist H2-Desktop.

```css
:root {
  --type-label:   var(--type-12);     /* 12  Label / Mono          */
  --type-body:    var(--type-16);     /* 16  Body                  */
  --type-lead:    var(--type-18);     /* 18  Lead, Markt-Titel     */
  --type-h2:      var(--type-32);     /* 32  H2 Desktop; 24 mobil  */
  --type-h1:      var(--type-48);     /* 48  H1; fluid unter 768   */
  /* --type-display ist bereits 3.5rem = 56 */
  --lh-label: 1.4;
  --lh-body:  1.55;
  --lh-lead:  1.45;
  --lh-h2:    1.2;
  --lh-h1:    1.12;
  --lh-display: 0.95;
}
```

Mobil (`max-width: 767px`): H2 = `--type-24` (24). Display = `2.5rem` (40).
H1 bleibt die vorhandene Fluid-Formel (~29 bei 390). Das sind Enden derselben Stufen, keine siebte Stufe.

### Element → Stufe

| Element | Stufe | 1280 | 390 | Gewicht / LH / Farbe |
|---|---|---|---|---|
| Hero-KPI „439,9“ (nur `.v4-riesenzahl` im Kopf) | **Ausnahme** `--type-riesenzahl` | 248 (Ist, unverändert) | 88 | 500, LH 0,9. Eine Zahl pro Seite. Nicht in der 6er-Skala, nicht in diesem Auftrag verkleinern |
| Kapitel-Kernzahl `.v4-tag-kern`, `.v4-system-pct` | Display | **56** | **40** | 500, LH 0,95, Tracking −0,03, Space Grotesk, tabular. Einheit „GWh“ sitzt im selben Textknoten — ohne HTML-Änderung nicht separat kleiner zu setzen |
| Seiten-H1 `.v4-h1` | H1 | 48 | ~29 | 400, LH 1,12. Bleibt. |
| Kapitel-H2 `.v4-chapter-h2` | H2 | **32** | **24** | 500, LH 1,2, max 32ch. War 48/28 |
| Subline im Kopf `.v4-subline` | Lead | 18 | 18 | 400, LH 1,45 |
| Markt-Insights-Titel | Lead | 18 | 18 | 600 |
| Fließtext `.v4-tag-side`, Schritte-Body, Fußnoten, Markt-Text, Kapitel-Foot-Links | Body | **16** | **16** | 400, LH 1,55, Farbe **`--ink`** (nicht mehr Grau) |
| Schritte-Titel „Nacht“ | Body | 16 | 16 | 600, Ink |
| Kicker, Kapitel-Nr. „02 · Das System“, Rang-Caption, Markt-Meta, Chip „Modellschätzung“ | Label / Mono | 12 | 12 | 400, JetBrains Mono, Tracking 0,06–0,08em, Caps wo schon Caps, Farbe muted (≥ 4,5:1, Ist erfüllt) |
| details summary | Body | 16 | 16 | 500, Ink, min-height 44 |

Grau nur noch für Meta/Label, nie für erklärenden Fließtext.

---

## 4. Abstände — 4/8er-System

Vorhandene `--space-*` nutzen (4, 8, 12, 16, 20, 24, 32, 40, 48).

| Stelle | Soll |
|---|---|
| Kapitel `.v4-chapter` `margin-top` / `padding-top` | 32 (`--space-8`) |
| Kapitel-Nr. → H2 | 8 |
| H2 → Kernzahl | 16 |
| Kernzahl → Fließtext | 16 |
| Fließtext-Absätze | 12 |
| details `margin-top`, Haarlinie | 12, `border-top: 1px solid var(--linie)` |
| Kapitel-Foot (Link „03 · Ort“) `margin-top` | 16 |
| Markt-Insights `padding-block` | 32 / 24, `margin-top` 32 |
| Schritte `padding-block` je `li` | 16, Ziffernspalte 40 |

---

## 5. details / summary

Gilt für „Ergänzungen (Preis, Monatsmodell)“, „Tag in drei Phasen …“ (mobil) und „Mittel und Fenster“.

```css
details > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;          /* Tap */
  padding: 8px 0;
  font-family: var(--font-space-grotesk), sans-serif;
  font-size: var(--type-16);
  font-weight: 500;
  line-height: 1.3;
  color: var(--ink);
}
details > summary::-webkit-details-marker { display: none; }
details > summary::marker { content: none; }

/* Chevron rechts: der Text bleibt auf der gemeinsamen Kante. */
details > summary::after {
  content: "";
  display: block;
  width: 8px;
  height: 8px;
  margin-left: auto;
  flex: 0 0 8px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);          /* zu: nach unten */
  transition: transform 180ms ease;
}
details[open] > summary::after {
  transform: rotate(225deg);         /* offen: nach oben */
}
details > summary:focus { outline: none; }
details > summary:focus-visible {
  outline: 2px solid #B4532A;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  details > summary::after { transition: none; }
}
```

Offener Body: `padding-top 8`, `padding-bottom 16`, gleiche Kante.
Default geschlossen — die 44-px-Zeile ist reserviert, kein CLS beim Font-Load.
Öffnen ändert die Höhe erwartbar (Inhalt), nicht durch nachträgliches Messen.

Chip „Modellschätzung“ und das Wort „Modell“ in Fließtext/Fuß bleiben sichtbar (keine Inhaltsänderung). Am 09.11. (kein Überschuss) erscheint der Chip nicht — das ist Inhalt, nicht Layout.

---

## 6. Konkrete Änderungen, Bau-Reihenfolge

Einen Lauf, dann Review. Reihenfolge, damit nichts zweimal angefasst wird:

1. **Tokens** in `globals.css` `:root`: `--page-max`, `--page-gutter` (20/48), `--grid-*`, Alias `--type-label/body/lead/h2`. Keine neuen Farben außer dem schon vorhandenen Rost `#B4532A`.
2. **`.v4-content`** auf die neuen Tokens. Die Regel `.v4-footnote { max-width: 68ch }` vom Container lösen, auf `p` legen. Prüfen, dass dieselbe Falle nicht auf `/monat` und `/ort` sitzt.
3. **`.v4-chapter-h2`**: die überschreibende Regel `font-size: var(--type-48)` streichen bzw. auf `--type-32` (mobil `--type-24`) setzen, Gewicht 500, max-width 32ch.
4. **`.v4-tag-kern` und `.v4-system-pct`**: `font-size: var(--type-display)` (mobil 2,5rem). Die 140–190-px-Regel an `.v4-system-pct` entfernen — an einem Überschusstag würde sonst wieder eine Riesen-Zahl stehen.
5. **`.v4-tag-side`**: 16 px, `--ink`, LH 1,55. Schritte (`.v4-st-*`) auf Body 16, Ziffernspalte 40.
6. **`MarktInsightsBlock.module.css`**: `max-width` und Extra-Padding (inkl. Mobile `padding: 12px 0`) entfernen. Titel Lead 18 / 600, Text Body 16 Ink. Der Block behält `v4-content`.
7. **details** wie Abschnitt 5, in globals, für die drei Stellen auf `/tag`.
8. **Header** (`header.site-header > div`) und **Footer** (`footer.border-t > div.mx-auto`) auf dasselbe Raster. `.legal-footer` selbst **kein** zweites Padding. Das ist site-weit — gewollt, eine Kante auf allen Seiten.
9. **Vertikaler Rhythmus** Kapitel 32/32, Foot 16, Markt 32.
10. Selbst prüfen: 1280 und 390, hell und dunkel, WebKit/Safari; alle Kanten 64 bzw. 20; H2 32/24; Kernzahl 56/40; summary 44 px, Fokusring Rost; `scrollWidth === clientWidth`; Labels ≥ 12; „Modell“ sichtbar; prefers-reduced-motion ohne Chevron-Transition.

Inject-CSS ist Mockup-Technik (`!important`). Im Bau Spezifität und Quellen-Ordnung sauber lösen, besonders das CSS-Modul.

---

## 7. Verhältnis zum `/monat`-Vorentwurf

Verglichen mit `/workspace/speicherpilot/forschung/design_monat_v1/` (SPEZIFIKATION.md und Skizzen, 12.11.).

**Identisch, so übernehmen:**

- Linke Kante 64 bei 1280, 20 bei 390. `/monat` setzt das als `padding: 0 64px` auf ein 1280-Artboard; wir als `--page-max: 1248` + Gutter 48 (Offset 16). Inhaltsbreite in beiden Fällen 1152.
- H1 48 Desktop. H2 **32 Desktop / 24 mobil** — bewusst an `/monat` angeglichen (erste Skizze dieses Aufräumens hatte 24/24; 32 gibt dem Kapitel-Titel mehr Stand, bleibt klar unter H1 48).
- Lead 18, Body 16, Label 12 Mono, Display-Token 56, Rost `#B4532A`, Space Grotesk + JetBrains Mono, 8er-Abstände.

**Abweichungen, bewusst:**

| Thema | /tag (diese Spec) | /monat-Vorentwurf | Empfehlung |
|---|---|---|---|
| Viewport > 1280 | Kappe 1248, Margin wächst (Kante 144 bei 1440) | Artboards nur 1280, fest 64 Pad | Für Produktion die Kappe übernehmen, sobald `/monat` gebaut wird |
| Lead mobil | 18 (eine Stufe) | 16 (`.lead` mobil) | 18 behalten, auch auf `/monat` — sonst eine versteckte siebte Stufe |
| Insight-Zahlen `/monat` | — | 32 Desktop / 24 mobil (wie H2) | Zulässig: das sind Kapitel-Kennzahlen *neben* dem Graph, nicht die Display-Zahl. Graph-Display (y-Werte, Referenz 64,4) bleibt 12 Mono in der Achse, die große abgelesene Zahl unter dem Graph wäre Body 16 in fester Zeile (laut sites-Auftrag). Keine neue Stufe. |
| Vertikaler Rhythmus | Kapitel 32 | `/monat` dichter (8–16, dashboardartig) | Dichte auf `/monat` darf enger bleiben. Horizontalraster und Typostufen sind verbindlich. |
| `--type-14` | auf /tag nicht mehr als Stufe | in Tokens noch vorhanden | Gemeinsam streichen oder nur für Chart-Achsen (Label bleibt 12) |

---

## 8. Selbst-QA (Mockups)

Gemessen nach Inject, Chromium, Full-Page:

| Check | 1280 | 390 |
|---|---|---|
| Overflow (`scrollWidth > vw`) | nein, 1280 | nein, 390 |
| Kante Kopf, H1, H2, Kern, Side, Fußnote, Schritte, details, Markt, Legal | **64** | **20** |
| H2 | 32 | 24 |
| Kernzahl | 56 | 40 |
| Side / Fußnote | 16, Ink | 16, Ink |
| details summary `min-height`, textLeft | 44, 64 | 44, 20 |
| „Modell“ im Footer und im Fließtext | sichtbar | sichtbar |

Hero-Zahl unverändert. Kein Inhalt geändert.

---

## 9. Dateien

```
/workspace/speicherpilot/forschung/design_tag_aufraeumen_v1/
  SPEC.md
  src/tag_aufraeumen.css          Inject-CSS
  src/build_mockups.py            Aufnahme + Annotation
  befund_1280_hell.png            Ist, Kanten und Größen markiert
  befund_1280_dunkel.png
  befund_390_hell.png
  befund_390_dunkel.png
  soll_1280_hell.png              Vorher/Nachher: Nachher, Full-Page, Inhalt gleich
  soll_1280_dunkel.png
  soll_390_hell.png
  soll_390_dunkel.png
  raster_overlay_1280.png         Soll + 12 Spalten, Kante 64, Gutter 48
  raster_overlay_390.png          Soll + 4 Spalten, Kante 20, Gutter 20
  details_zu_offen.png            1280 hell, Zu und Offen, gestylter Chevron
```

---

## 10. Offene Risiken

1. **Safari/WebKit** in dieser Umgebung nicht startbar (fehlende Host-Libs: libsoup, libevent, …). Die Befunde sind CSS-Kanten und Schriftgrößen, engine-unabhängig — außer dem nativen `details`-Marker, den wir sowieso ersetzen. Vor dem Merge: einmal in Safari Desktop prüfen, besonders Chevron und Fokusring.
2. **Hero-Riesenzahl 248 px** bleibt außerhalb der 6er-Skala. Wenn Phillipp den Kopf ebenfalls „unsauber“ findet, ist das ein zweiter, eigener Auftrag — nicht in diesem Aufräumen versteckt mitziehen.
3. **`.v4-system-pct { 140–190 px }`** muss im selben Lauf weg; sonst erscheint an einem Überschusstag wieder eine Display-Zahl größer als der Hero.
4. **Einheit „GWh“** in der Kernzahl ist derselbe Textknoten. Kleinere Einheit = eine HTML-Änderung (`<span class="v4-kern-unit">`), kein Inhalt, aber kein reines CSS. Optional, nicht nötig für den Aufräum-Effekt.
5. **Header- und Footer-Raster sind site-weit.** Gewollt (eine Kante), aber sites soll das bewusst mergen, nicht nur unter `/tag`.
6. **Markt-Insights liegt in einem CSS-Modul** mit gehashtem Klassennamen. Globals allein verlieren gegen `padding: 12px 0`, wenn die Spezifität nicht sitzt — das Modul selbst ändern.
7. **Legal-Links sind mint/petrol** (`#0F6E7C`), nicht Rost. Nicht Teil der drei Befunde; in einem Farb-Durchgang angleichen (Ink + Unterstreichung, Fokus Rost).
8. **„Modellschätzung“-Chip** ist am 09.11. nicht im DOM (kein Überschuss). An einem Überschusstag prüfen, dass er sichtbar bleibt und auf der Kante sitzt.
9. Inject-CSS nutzt `!important`. Bau: Quelle und Spezifität, nicht denselben Hammer.
