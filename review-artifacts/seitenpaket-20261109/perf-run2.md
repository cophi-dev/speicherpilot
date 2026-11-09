# Performance Run 2 — PR #76 Nachlauf

**Methode:** `pnpm build` → `node scripts/perf-run2-bench.mjs --port=3097 --runs=9` (Median aus 9 `fetch()`-Läufen, voller HTML-Body, lokal `next start`).  
**Copy/UI:** unverändert gegenüber fachlicher Abnahme.

## Vorher (PR #76 Stand `2b5e08d`, ein Lauf)

| Route | Median TTFB | Bytes HTML |
|-------|-------------|------------|
| `/tag/2026-10-29?faktor=1` | ~1960 ms | 205 110 |
| `/monat/2026-10?faktor=1&fahrweise=spitze` | ~989 ms | 80 636 |

Ursachen: synchrones Live-`loadGermanyPower` (61 Tage), Monolith-Parse `fleet-month-bundle.json` (~2,7 MB) im SSR, große Zeitreihen in RSC-Props.

## Nachher (dieser Commit, 9 Läufe)

| Route | Median TTFB | Bytes HTML | Einzelwerte TTFB (ms) |
|-------|-------------|------------|------------------------|
| `/tag/2026-10-29?faktor=1` | **46** | 207 609 | 201, 58, 74, 49, 43, 46, 42, 45, 43 |
| `/monat/2026-10?faktor=1&fahrweise=spitze` | **19** | 78 442 | 33, 23, 20, 23, 19, 18, 19, 18, 18 |

Ziel „< 500 ms TTFB“: **erfüllt** (warm; erster Lauf nach Serverstart typisch ~200 ms).

## Maßnahmen (technisch)

1. **Fleet-Bundle sharding:** `data/national-fleet/2026-10/fleet-month-meta.json` + `runs/x{N}_*.json` (~225 KB/Lauf). Hot path lädt nur Meta + aktiven Lauf; Faktor-Umschaltung = weiterer Shard-Read/API-GET. Parität: `lib/fleetRunShardParity.test.ts` (JSON byte-identisch zum Monolith).

2. **Tag/Monat ohne blockierendes Energy-Charts:** `data/tag-pages/roll-snapshot.json` (committed, revalidate weiterhin 1800 auf `/tag`). `/tag` im Snapshot-Zeitraum → `buildGermanyViewFromTagSnapshot`; `/monat` → `loadMonatPageData` aus Snapshot zuerst.

3. **Chart-Code-Splitting:** `NationalFleetTimeSeriesChart` → `dynamic(..., { ssr: false })` + Lazy-Load `NationalFleetTimeSeriesChartInner`. Keine Serie mehr im HTML; Daten via `/api/national-fleet/series` (Shard, `Cache-Control: public, max-age=86400`).

## Datenintegrität

- 12 Run-Shards: SHA256 in `manifest.json` / `fleetRunShardSha256()`.
- Zeitreihen-Payload ×1 spitze: identisch Monolith vs. Shard (`fleetRunShardParity.test.ts`).

## Client-Transfer

- Chart-JS erst nach First Paint (separater Chunk).
- API-Response weiter ~220 KB/Monat (ein Lauf), nicht 2,7 MB; parallel zum sichtbaren KPI-Shell.
