# Paket 4 — Kurzbericht (Opus Monat A+C)

Stand: 10. November 2026, Branch `cursor/paket3-award-alle-ebenen-048c`, PR [#81](https://github.com/cophi-dev/speicherpilot/pull/81) (nicht gemergt).

## Umgesetzt

- **Konzept A** auf `/monat/2026-10`: Streudiagramm (log Ladung × Wirkung GW), drei Pfade, Pool-Linie 134,2 GWh, Referenz 64,41 GW, Endlabel Markt ×10; Tastatur ←→ / ↑↓; Werkbank = Viertelstundenkurve. Mobil: drei Pfad-Miniplots (×1–×10).
- **Konzept C**: Dauerlinie mit Scroll-Morph (bei `prefers-reduced-motion` sortiert); Linien beobachtet + gewählter Lauf.
- **Entfernt** auf Monat mit Lauf: Zusatznutzen-Tabelle, Faktor-/Fahrweisen-Knöpfe, Paket-3-Balken, SoC/Überschuss-Kapitel, Markt-Insights-Liste.
- **Blocker:** `/ort` nutzt `loadLargeBatteryFleet()` vor Snapshot; `MarktInsightsBlock` mit horizontalem Padding.
- **Methodik:** `#monat-konzept-ac` mit Formeln und Annahmen; Tie-Break dokumentiert.

## Tests

- `lib/monatKonzept.test.ts` — Skizzenwerte (12 Punkte, 96,76 GW, 134,2 GWh, Dauerlinie 2980 qh).
- 673 Tests grün.

## Visuelle Korrektur (Sichtprüfung v3)

- **C:** Eigene Sortierung pro Reihe (`sortRankObserved` / `sortRankStorage`); morph=1 monoton; weiße Beobachtungslinie dünn, Szenario darüber; Fläche >60 GW.
- **A:** HTML-Labels mit Playwright-Kollisionstest (`label-collision.json`, ok).
- **Mobil:** `has-fleet-konzept` DOM-Reihenfolge (Nav → Kopf → Konzept); Miniplot-Padding.
- **Methodik:** Bullet Unsicherheit + Plateau-Hinweis.

## Konzept A — SVG-Labels + Kollisionstest (Post 2ca167c)

- **Struktur:** HTML-Overlay raus; alle Labels als SVG-`<text>` im Plot-viewBox; `placeLabels()` (N/S/E/W/…) mit Hindernissen Punkte/Pfade/Ticks/Achsentitel; zweiter Pass mit `getBBox` nach Paint.
- **Plot:** viewBox-Breite = Shell-Pixelbreite (`ResizeObserver`), Höhe 520 px, Schrift ≥ 12 px; Y-Titel außerhalb des Plotrahmens.
- **Mobil:** reservierte Wertzeile oben, ×/GWh getrennt, negativ zwischen Punkt und Faktor.
- **Abnahme:** `label-collision-before-2ca167c.json` (alter Test fälschlich ok) vs. `label-collision.json` (SVG `getBBox` / Pfadsegmente, 1440/1024/390).

### Mobil / Feinschliff (Post f7f16b9)

- Wertezeile **oberhalb** des Miniplots (×/GWh darunter; letzte GWh-Spalte `text-anchor: end`).
- Referenzlabel Desktop: `text-anchor: end` am Plot-Innenrand.
- C: `morphScrollTrackCompact` bei sortiert + kleineres `PAD_B_C` (~24 px bis Fußnote).
- Mobil-Kollision: `getBoundingClientRect`-Overlap Wert↔Kreis + `value.bottom <= circle.top - 3px` (alter Test prüfte nur eine Teilmenge der Überschneidungs-Logik).

## Designrunde (Post eb95331)

1. **Inhaltbreite:** Konzept-Slot wieder `v4-content` + `konzeptRoot` (max `min(94rem, 1240px)`); gleiche Flucht wie Kopf/Nav.
2. **Markt-×10-Callout (1440):** links unterhalb des Punktes, vollständig in der Plot-Overlay-Fläche (`nowrap` auf GW-Zeile); kein Fußnoten-Overlap.
3. **Spitze-×10-Label:** einzeilig (`white-space: nowrap`), mehr Kopf (`PAD_T` + Overlay-Inset).
4. **Mobil-Miniplots:** 12 px rechter Innenabstand; Wertlabels bei negativen GW unter dem Punkt.
5. **Abnahme:** `label-collision.json` prüft Fluchtlinie (≥ Kopf), Callout vs. Fußnote/Plot, Mobil-Clip + Label-auf-Punkt.

## Korrektur 7 (vor Abnahme)

- **C mobil:** X-Ticks unter dem Plot; Y-Tick −60 nach innen; Tal-Label oberhalb, links; SVG/CSS fix 320 px.
- **A 1440:** ×10 links neben Punkt; `factor×own-point` im Kollisionstest.
- **Screens:** Ordner geleert, Set neu (1440/390 dark+light fullPage, C morph, 3 Crops; kein morph05).

## Designrunde v6 (Urteil NEIN → Korrektur)

- **C mobil:** eigene Layout-Breite (`buildDauerlinieScene`, Modus `mobile`), Plot gesamt ~320 px CSS, Y-Ticks −60/0/60/100 GW, X in Stunden 0/350/700 h (745 h); Hero „96,76 GW“ ≥ 40 px.
- **Hierarchie:** H1 `has-fleet-konzept` 56 px (≥1280) / 32 px mobil; Abschnitt als Mono-Eyebrow 12 px; C mit Aussage-H2 aus Lauf-Daten.
- **Text:** je Chart eine Caption; Modell/Quelle in `<details>` **Annahmen**; „Punkt wählen“ nur Desktop (+ Tooltip am ersten Punkt).
- **A 1440:** Referenz oberhalb Nulllinie rechts; Pool-Differenz mit 8 px; Faktor ×1–×10 (12 px muted) in Kollision; Mono-Labels 12 px.
- **Mobil:** GWh ≥ 1000 → TWh (eine NK); Werte in Textfarbe; Morph snap 0|1 ≤ 600 ms, kein morph0.5-Screenshot.
- **Abnahme:** `label-collision.json` grün 1440/1024/390; Kontroll-Crops `crop-c-390-light.png`, `crop-kopf-1440-dark.png`, `crop-miniplot-markt-390-light.png`.

## Visuelle Korrektur (Sichtprüfung v2)

- **A 1440:** Hero ~520px, volle Breite + Flottentabelle, Pfadlabels, durchgehende Nulllinie, großes Markt-×10-Label, getrennte Chart-Fußnote.
- **C:** Morph-Pfad nach X sortiert (`morph=0|0.5|1` für Abnahme); Labels Tal/Spitze, 60-GW-Linie, Spitze-Fläche; kürzerer Scroll-Track.
- **Mobil:** Miniplots mit Linien, GW-Beschriftung, Nulllinie; Werkbank erst nach Punktwahl.

## Abweichungen (rest)

- Kein separates Scrollytelling-Panel rechts bei C wie in der Skizze.
- Konzept **B** nicht umgesetzt.

## Artefakte

`node scripts/paket4-abnahme.mjs` nach `pnpm build && pnpm start -p 3001` → `docs/audit-2026-11/paket4/screens/`, `lighthouse-summary.json`.

**Lighthouse mobil (Abnahme-Lauf):** `/monat/2026-10` Perf. 78, A11y 100, CLS ≈ 0,00025; `/ort` Perf. 86, A11y 100.
