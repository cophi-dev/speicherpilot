# Fix-Paket: Kontext aus den Daten auf `/beitraege`

Stand: 16.11.2026, Europe/Berlin — Vortag **15.11.2026**

## Ursache

- `app/beitraege/page.tsx` nutzte `export const dynamic = "force-static"` und `loadTagRollSnapshot()` (committed `data/tag-pages/roll-snapshot.json`, `coverageEnd` 08.11.).
- Der Block wurde beim Build eingefroren; Regeln wie `trockenstrecke` liefen auf Snapshot-Daten ohne `focusDayKey` → „8.11. … 14. Tag in Folge“.
- Zusätzlich begrenzte `WINDOW_END = 2026-11-08` in `lib/marktInsights.ts` das Analysefenster, sodass ein Tag-Fokus nach dem Snapshot-Ende nicht in den Regeln ankam.

## Fix

- `loadBeitraegeMarktInsights()`: dieselbe Kette wie `/tag` — `resolveNavShortcuts()` → `loadGermanyViewForTag(lastCompleteDayKey)` → `marktInsightsForRoute({ route: "beitraege", focusDayKey })`.
- ISR: `export const revalidate = 1800` (30 min, wie `/tag`).
- `marktInsightWindowEnd(focusDayKey)` erweitert das Regel-Fenster data-driven bis zum Fokustag.
- Tests: `lib/beitraegeKontext.test.ts` + Revalidate-Literal in `dailySeriesCache.test.ts`.

## Blocktext Preview (Vortag 15.11.)

1. **Preis-Regime:** Vom 28.10. bis 11.11., 15 Tage, lag jedes Tagesminimum über 150 €/MWh.
2. **Trockenstrecke:** 15.11. ist der 21. Tag in Folge ohne messbaren Überschuss (unter 0,05 GWh). · 10.10.–15.11.
3. **Negativpreis:** Vom 10.10. bis 15.11. lag der Preis 1,75 Stunden unter null — nur 10.10. (0,25 h) und 25.10. (1,50 h).

## Screenshots (hell)

- `kontext-block-1280-light.png`
- `kontext-block-390-light.png`