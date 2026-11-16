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
- **Idempotenz:** SHA-gleicher Payload wird nicht überschrieben; Schreiben mit `intervalCount < 90` oder leerer Payload wirft einen Fehler.

Monats-Horizont rollierend: gleicher Solver-Pfad wie Oktober (`run_fleet_factor_month.py`); in diesem P0 nur Tagespfad automatisiert — Monats-Backfill weiterhin manuell / separater Batch.