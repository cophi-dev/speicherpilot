# Monat Paket A · Regler-Hero · 16.11.2026

## PR

Branch: `cursor/monat-regler-paket-a-9e95` (gegen `main`).

## Preview

`/monat/2026-10` leitet ohne Query auf `?faktor=10&fahrweise=spitze` (Erstaufruf mit Wirkung).

Weitere Zustände:

- `/monat/2026-10?faktor=5&fahrweise=spitze`
- `/monat/2026-10?faktor=10&fahrweise=markt`

## Asset

| Datei | Roh (JSON) | gzip |
|---|---:|---:|
| `data/national-fleet/2026-10/fleet-month-compact.json` | 494 160 B | **97 092 B** |

Erzeugung: `pnpm data:fleet-compact` · Lazy-Load: `GET /api/national-fleet/compact`

## Design-Nachbesserung (Urteil 16.11.2026, 14:40)

**Head-SHA:** `7a13e1121ee500a9794809fc92b1925003f44f30`

| Muss | Kriterium | Messung (Playwright, `scripts/measure-monat-regler-design.mjs`) |
|---|---|---|
| 1 Graph mobil | Plothöhe ≥240 px @390, ≥320 @768; Labels 12 px; viewBox = Containerbreite | 390: SVG **356×298** (Plot **240** + SoC), **yLabel 12 px**; 768: SVG **734×378** (Plot **320** + SoC) |
| 1 Tap | Treffer ≥44 px, Tooltip „Tag öffnen“ | Tag-Tap → Tooltip mit Link; Hinweis „Tag antippen für den Tagesverlauf“ |
| 2 Erstaufruf | Default ×10 Spitze, y 0–100 GW | Redirect ohne Query; Ticks 0/20/…/100, Achsentitel „GW“ |
| 3 Linien | Direktlabels, Markt gestrichelt, Striche opaz 1 | `beobachtet` **#6B7580**; Markt **#B4532A / #FF8A5B** `6 3`; Caption „Striche = …“ |
| 4 Steuerblock | Slider aus <768 px, Chips 68×50, KPI 28/32 px | Slider `display:none` @390; KPI `font-size` 28 px; Slider-Hint aus; Chip-Sub **12 px** |
| 4 Graph-Oberkante | ≤520 px @390×844 (Spitze-Erstzustand) | **chartTop ≈433 px** (×10 Spitze); ×10 Markt mit 4 KPIs **≈533 px** (2 Extra-Kacheln) |

Kontrast Slider-Label im Hero: **#9EA3A9** (7,66:1 auf dunkel).

Rohdaten: `docs/audit-2026-11/monat-paket-a/measures-nachbesserung.json`

## Screenshots

`docs/audit-2026-11/monat-paket-a/screenshots/` — 1280 + 390, hell/dunkel: Erstaufruf (×10 Spitze), ×5 Spitze, ×10 Markt (`scripts/capture-monat-paket-a.mjs`).

## Tests

- `lib/monatReglerAsset.test.ts`
- `lib/monatReglerKpis.test.ts`
- `lib/monatReglerPflichtzeile.test.ts` (inkl. `(n−1)` einfach)

## Akzeptierte Abweichungen (Konzept v1)

Brush/Pinch, Flächenfüllung, 2 h/4 h nur Text — unverändert laut Freigabe.

## Scope

`/vision`, PR #18, SEO-Titel nicht angefasst.