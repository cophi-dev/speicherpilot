# Design-Run — PR #76

**Baseline (Design, Head `50634c3`):** siehe `BEFUND-design-baseline.md`  
**Messung nach Fix:** `design-run-ca8746e.json` (lokal `next start`, Playwright Chromium)

## 1) CLS `/monat/2026-10` (1280×900, light)

| | Wert |
|--|------|
| Vorher (Run23) | **0,929** |
| Nachher (Skeleton + feste `min-height`) | **0** (PerformanceObserver-Fenster ~4,5 s nach Load) |

Skeleton: `NationalFleetTimeSeriesChartSkeleton` — 709 px (375) / 508 px (Desktop), +30 px mit Vergleichslegende.

## 2) Tab-Wechsel (Desktop-Nav, warm nach Prefetch)

| Wechsel | ms |
|---------|-----|
| Start → Tag | 2804 |
| Tag → Monat | 175 |
| Monat → Start | 100 |

Maßnahmen: `NavigationMain` (alter Inhalt bis `h1` im Zielbaum), `router.prefetch` + `prefetch` auf Hauptnav, 2 px `NavigationProgress`.

## 3) X-Achse (375 dark)

Crop: `x-axis-375-dark-ca8746e.png` — Ticks 1/8/15/22/29, letztes Label `31.` mit Klasse `is-end` (innen rechts), Schrift 12 px.

## 4) Faktor-Caption

`NationalFleetTimeSeriesChartInner`: Kurve und Caption wechseln atomar per `ChartFrame` erst nach API-Response (kein ×1-Caption zu ×N-Kurve).
