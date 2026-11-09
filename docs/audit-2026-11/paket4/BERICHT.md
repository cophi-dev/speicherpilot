# Paket 4 — Kurzbericht (Opus Monat A+C)

Stand: 9. November 2026, Branch `cursor/paket3-award-alle-ebenen-048c`, PR [#81](https://github.com/cophi-dev/speicherpilot/pull/81) (nicht gemergt).

## Umgesetzt

- **Konzept A** auf `/monat/2026-10`: Streudiagramm (log Ladung × Wirkung GW), drei Pfade, Pool-Linie 134,2 GWh, Referenz 64,41 GW, Endlabel Markt ×10; Tastatur ←→ / ↑↓; Werkbank = Viertelstundenkurve. Mobil: drei Pfad-Miniplots (×1–×10).
- **Konzept C**: Dauerlinie mit Scroll-Morph (bei `prefers-reduced-motion` sortiert); Linien beobachtet + gewählter Lauf.
- **Entfernt** auf Monat mit Lauf: Zusatznutzen-Tabelle, Faktor-/Fahrweisen-Knöpfe, Paket-3-Balken, SoC/Überschuss-Kapitel, Markt-Insights-Liste.
- **Blocker:** `/ort` nutzt `loadLargeBatteryFleet()` vor Snapshot; `MarktInsightsBlock` mit horizontalem Padding.
- **Methodik:** `#monat-konzept-ac` mit Formeln und Annahmen; Tie-Break dokumentiert.

## Tests

- `lib/monatKonzept.test.ts` — Skizzenwerte (12 Punkte, 96,76 GW, 134,2 GWh, Dauerlinie 2980 qh).
- 673 Tests grün.

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
