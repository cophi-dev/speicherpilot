# Performance Run 2 — PR #76 Nachlauf

**Methode:** `pnpm build` → `node scripts/perf-run2-bench.mjs --port=3097 --runs=9` (Median aus 9 `fetch()`-Läufen, voller HTML-Body, lokal `next start`).  
**Copy/UI:** unverändert gegenüber fachlicher Abnahme; Snapshot-Tage zeigen im Kicker `Datenstand Energy-Charts-Snapshot · eingefroren <builtAt-Datum>`.

## Vorher (PR #76 Stand `2b5e08d`, ein Lauf)

| Route | Median TTFB | Bytes HTML |
|-------|-------------|------------|
| `/tag/2026-10-29?faktor=1` | ~1960 ms | 205 110 |
| `/monat/2026-10?faktor=1&fahrweise=spitze` | ~989 ms | 80 636 |

Ursachen: synchrones Live-`loadGermanyPower` (61 Tage), Monolith-Parse `fleet-month-bundle.json` (~2,7 MB) im SSR, große Zeitreihen in RSC-Props.

## Nachher Run 2 (Snapshot-Fast-Path, 9 Läufe)

| Route | Median TTFB | Bytes HTML | Einzelwerte TTFB (ms) |
|-------|-------------|------------|------------------------|
| `/tag/2026-10-29?faktor=1` | **43** | 207 609 | 146, 52, 44, 43, 37, 37, 39, 38, 49 |
| `/monat/2026-10?faktor=1&fahrweise=spitze` | **16** | 78 442 | 21, 16, 15, 17, 16, 14, 15, 18, 15 |

Ziel „< 500 ms TTFB“: **erfüllt** (warm; erster Lauf nach Serverstart typisch ~150 ms).

## Nach Blocker-Fix (Snapshot nur für alte, vollständige Tage)

**Policy (`lib/tagRollSnapshotPolicy.ts`):** Snapshot nur für Berlin-Tage mit vollständiger QH-Abdeckung (92/96/100) innerhalb `coverage`, und nur wenn `dayKey ≤ today − 3` (heute, gestern, vorgestern → Energy-Charts live). Unvollständige Snapshot-Tage (z. B. 68 QH am 09.11.) → live.

| Route | Median TTFB | Bytes HTML | Hinweis |
|-------|-------------|------------|---------|
| `/tag/2026-10-29?faktor=1` | **43** | 207 609 | weiter Snapshot |
| `/tag/2026-11-08?faktor=1` (gestern) | **25** | 154 637 | Live-Pfad; erster Lauf nach Start ~608 ms (API), danach warm |
| `/monat/2026-10?faktor=1&fahrweise=spitze` | **16** | 78 442 | Monatsende ≤ frozen → Snapshot |

**Preview-Prüfung Datenstand (lokal `next start`, 2026-11-09 today):**

- `/tag/2026-11-08` → Kicker `Datenstand 06:00` (kein `eingefroren`, kein Snapshot-Label)
- `/tag/2026-10-29` → `Datenstand Energy-Charts-Snapshot · eingefroren 2026-11-09`

## Maßnahmen (technisch)

1. **Fleet-Bundle sharding:** `data/national-fleet/2026-10/fleet-month-meta.json` + `runs/x{N}_*.json` (~225 KB/Lauf). Hot path lädt nur Meta + aktiven Lauf; Faktor-Umschaltung = weiterer Shard-Read/API-GET. Parität: `lib/fleetRunShardParity.test.ts` (JSON byte-identisch zum Monolith).

2. **Tag/Monat Snapshot mit Policy:** `data/tag-pages/roll-snapshot.json` (committed, nicht rollierend nachgepflegt). `tagRollSnapshotEligible` / `tagRollSnapshotMonthEligible` vor `buildGermanyViewFromTagSnapshot` bzw. `loadMonatPageData`. Build-Skript `scripts/build-tag-roll-snapshot.mjs` endet standardmäßig bei `2026-11-06` (`TAG_ROLL_SNAPSHOT_END` optional).

3. **Chart-Code-Splitting:** `NationalFleetTimeSeriesChart` → `dynamic(..., { ssr: false })` + Lazy-Load `NationalFleetTimeSeriesChartInner`. Keine Serie mehr im HTML; Daten via `/api/national-fleet/series` (Shard, `Cache-Control: public, max-age=86400`).

## Datenintegrität

- 12 Run-Shards: SHA256 in `manifest.json` / `fleetRunShardSha256()`.
- Zeitreihen-Payload ×1 spitze: identisch Monolith vs. Shard (`fleetRunShardParity.test.ts`).
- Grenztests: `lib/tagRollSnapshotPolicy.test.ts`, `lib/tagRollSnapshotRouting.test.ts`.

## Client-Transfer

- Chart-JS erst nach First Paint (separater Chunk).
- API-Response weiter ~220 KB/Monat (ein Lauf), nicht 2,7 MB; parallel zum sichtbaren KPI-Shell.
