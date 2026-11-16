# Monat Paket A · Regler-Hero · 16.11.2026

## PR

Branch: `cursor/monat-regler-paket-a-9e95` (gegen `main`).

## Preview

`/monat/2026-10` — Regler-Hero oben, bestehende Aggregat-Graphen (Monat v1) darunter.

Query-Beispiele:

- `/monat/2026-10?faktor=5&fahrweise=spitze`
- `/monat/2026-10?faktor=10&fahrweise=markt`

## Asset

| Datei | Roh (JSON) | gzip |
|---|---:|---:|
| `data/national-fleet/2026-10/fleet-month-compact.json` | 494 160 B | **97 092 B** |

Erzeugung: `node scripts/build-fleet-month-compact.mjs`

Lazy-Load: `GET /api/national-fleet/compact` nach First Paint (SSR-Platzhalter mit H1 + Ladehinweis).

## Tests

- `lib/monatReglerAsset.test.ts` — Parse, 2980 qh, ×1 ohne Overlay, ×10-Spitze-Tagesmax
- `lib/monatReglerKpis.test.ts` — Konzept-Stichprobe (64,41 / 50,43 / 92,76 / 56,7 GW)
- `lib/monatReglerPflichtzeile.test.ts` — Pflichtzeile ohne € / „netzdienlich“

## Screenshots

Unter diesem Ordner (Erstaufruf + Zustände ×5 Spitze, ×10 Markt; 1280 + 390, hell/dunkel) — bei Cloud-Vorschau nachzureichen falls lokal nicht gerendert.

## Abweichungen vom Konzept v1

| Thema | Konzept | Umsetzung | Grund |
|---|---|---|---|
| Brush/Pinch-Zoom | Pinch + Brush auf Tage | Doppelklick auf Tag → Tages-Viertelstunde; Zurück per Klick | Erster Lauf: minimale Interaktion ohne zusätzliche Chart-Lib |
| Flächenfüllung zwischen Kurven | rost/Farbe für Laden/Entladen | Linien + Markt-Stress-Linien über Referenz | Zeitbudget; Daten und Regler stehen |
| 2 h / 4 h Regler | unscharf, kein Kurvenschalter | Textzeile „ohne Zeitreihe“ | bewusst Paket B |
| Pflichtzeile Aggregat-Graphen | neue Zeile überall | `MONAT_REGELR_GRAPH_CAPTION` auch in MonatV1Charts | eine Pflichtzeile je Graph auf der Seite |

`/vision`, PR #18 und SEO-Titel (`lib/seo/pageTitles`) nicht angefasst.