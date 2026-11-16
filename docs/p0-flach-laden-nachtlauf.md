# P0 Strukturumbau · Flach laden + Nachtlauf

## Lexikografische Zielstufe (Spitze)

1. **Stufe 1:** Minimierung der bundesweiten Restlast-Spitze \(R' = R + \text{Laden} - \text{Entladen}\) — unverändert (HiGHS-MIP bei Monat, LP+Greedy-Kappenachweis in TS für KPIs).
2. **Stufe 2:** Bei fixierter Spitze mit Toleranz **0,05 MW** (`PEAK_LEX_TOLERANCE_MW`, wie `solve_lex_peak` in `solve_simulator.py`):
   - Minimierung \(\sum c \cdot \Delta t\) (weniger **neue Last** / netto-Laden),
   - plus **L1-Glättung** der Ladeleistung: \(\lambda \sum_t |c_t - c_{t-1}|\) mit \(\lambda = 0{,}05\) MWh pro MW Rampe (`CHARGE_SMOOTH_MWH_PER_MW_RAMP`).

Implementierung: `mip_month.solve_min_peak_flat` (Stufe 1 MIP, Stufe 2 LP), TS-Fahrpläne über `artifacts/.../solve_storage_lp_cli.py`.

## Nachtlauf

- **Orchestrierung:** `node scripts/national-fleet-nachtlauf.mjs` (`pnpm data:national-fleet-nachtlauf`)
- **Zeitplan:** `.github/workflows/national-fleet-nachtlauf.yml` (täglich 04:30 UTC)
- **Vortag · TAGESHORIZONT:** 3 Fahrweisen × 4 Stufen → `data/national-fleet/<yyyy-mm>/days/<yyyy-mm-dd>/x{N}_*.json`
- **Rollierend · MONATSHORIZONT:** gleicher Batch wie Vortag: `01.` bis Vortag, `horizon: month`, `asOfBerlin` = Vortag → `data/national-fleet/<yyyy-mm>/runs/` + `manifest.json` (`monthFinal: true` am Monatsletzten)
- **Idempotenz:** SHA-gleicher Payload wird nicht überschrieben; Schreiben mit `intervalCount < 90` oder leerer Payload wirft einen Fehler.

## GitHub Action

- `permissions: contents: write` (`GITHUB_TOKEN`), `concurrency: national-fleet-nachtlauf`
- Nach Lauf: `pnpm test lib/nationalFleetNachtlauf.test.ts` + `national_fleet_nachtlauf.py --validate-staged` (Schema + Energiebilanz)
- Bei Grün: `git rebase origin/main`, Commit **`data: nachtlauf <datum>`**, Push **direkt auf `main`** — nur Pfade unter `data/national-fleet/**` (sonst Job rot)
- Kein `data/nachtlauf`-Branch / tägliches Merge-PR mehr

## Nachbesserung 1 (Beleg 29.10.)

- **Alt:** `solve_min_peak` (MIP Stufe 1) — **nicht** Greedy-unter-Kappe (klemmte R′ fälschlich flach auf 55,6 GW).
- **Neu:** `solve_min_peak_flat` bei gleicher Spitze (±0,05 MW).
- Energiebilanz Tageshorizont SoC 50/50: \(\sum c\eta\Delta t - \sum d\Delta t/\eta \approx 0\) (alt/neu jeweils `ok: true` in `oct29-x5-metrics.json`).
- Grafik: `scripts/generate_p0_oct29_comparison.py` → `review-artifacts/p0-flach-laden/`.