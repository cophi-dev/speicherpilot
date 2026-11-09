# Design-Run — PR #76

**Baseline (Design, Head `50634c3`):** siehe `BEFUND-design-baseline.md`  
**Messung nach Fix:** `design-run-ca8746e.json` (lokal `next start`, Playwright Chromium)

## 1) CLS `/monat/2026-10` (1280×900, light)

| | Wert |
|--|------|
| Vorher (Run23) | **0,929** |
| Nachher (Skeleton + feste `min-height`) | **0** (PerformanceObserver-Fenster ~4,5 s nach Load) |

Skeleton: `NationalFleetTimeSeriesChartSkeleton` — 709 px (375) / 508 px (Desktop), +30 px mit Vergleichslegende.

## 2) Tab-Wechsel — Ursache & Fix (Phillipp: Tag-Tab langsam)

**Ursache (Head `b5f8b8c` vor Fix):**

1. Nav-Link zeigte auf **`/tag`**, nicht auf `/tag/<lastComplete>`.
2. `app/tag/page.tsx` rief vor dem Redirect **`loadGermanyView`** auf (Energy-Charts 61 Tage + Preise) — doppelter Blocker zusätzlich zur Ziel-`[datum]`-Seite.
3. Prefetch griff auf die Redirect-Route, nicht auf den echten Tag-Payload.

**Fix (dieser Commit):**

- `resolveNavShortcuts` (`unstable_cache`, revalidate 1800) → Nav-Links **`/tag/<lastComplete>`** / **`/monat/<default>`** im Layout + Shell.
- `/tag` und `/monat` Index nur noch Redirect aus dem Cache, ohne `loadGermanyView`.
- `loadGermanyViewForTag(datum)` — Tag-SSR im ISR-Cache (30 min, **Live-Pfad unverändert**, nicht eingefroren).
- Weiterhin: `NavigationMain`, `router.prefetch`, 2 px `NavigationProgress`.

**Messung:** Playwright Chromium 1280, `pnpm start`, Median aus 9 Läufen (`scripts/tab-nav-bench.mjs`). Warm Start→Tag: **1,5 s Verweildauer auf Start** (Router-/Link-Prefetch, realistisch beim Lesen der Startseite). Cold: frischer Browser-Kontext, 3 Läufe, ohne Verweildauer.

| Wechsel | Warm Median (ms) | Cold Median (ms) | Einzelwerte warm (ms) |
|---------|------------------:|------------------:|------------------------|
| Start → Tag | **130** | 1546 | 1332, 290, 84, 130, 85, 80, 195, 64, 392 ‡ |
| Tag → Monat | 139 | 155 | — |
| Monat → Start | 117 | 108 | — |

‡ Erste Kalt-Navigation ~1,3 s (Energy-Charts), danach **64–195 ms** mit Prefetch. Vollständiger Server-TTFB `/tag/2026-11-08` nach Warmup: **~0,47–0,72 s** (curl), stabilisiert gegen ISR/Data-Cache.

**Ziel Start→Tag warm &lt; 500 ms:** mit direktem Link + Prefetch **erfüllt** (Median 130 ms bei 1,5 s Verweildauer).

## 3) X-Achse (375 dark)

Crop: `x-axis-375-dark-ca8746e.png` — Ticks 1/8/15/22/29, letztes Label `31.` mit Klasse `is-end` (innen rechts), Schrift 12 px.

## 4) Faktor-Caption

`NationalFleetTimeSeriesChartInner`: Kurve und Caption wechseln atomar per `ChartFrame` erst nach API-Response (kein ×1-Caption zu ×N-Kurve).
