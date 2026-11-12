#!/usr/bin/env python3
"""SpeicherPilot model fleet ×1/×2/×5/×10 — full October, no daily SoC reset."""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from mip_month import DT_H, ETA, RTE, MonthStorageMip

ROOT = Path(__file__).resolve().parent
INPUT_CSV = ROOT / "inputs" / "beobachtungen-viertelstunden-202610-berlin.csv"
INPUT_DEFS = ROOT / "inputs" / "definitionen-und-ergebnisse.json"
OUT = ROOT / "fleet_factor"
TS_OUT = OUT / "timeseries"
DAY_OUT = OUT / "daily"
EVENT_OUT = OUT / "events"

BASE_POWER_MW = 4_640.0
BASE_ENERGY_MWH = 8_150.0
MODEL_FLEET_SOURCE = "SpeicherPilot exportLaunchNationalDays.ts NATIONAL_BASE_FLEET (4,64 GW / 8,15 GWh, 12.11.2026)"
REF_RESIDUAL_PEAK_MW = 64405.9
MONTH_SURPLUS_POOL_GWH = 134.241975

FACTORS = (1, 2, 5, 10)


def additional_units(factor: int) -> int:
    """Konvention (a): ×k = k-mal Gesamtflotte sichtbar, Modell = (k−1)× Basis zusätzlich; ×1 = Ist (0 Zusatz)."""
    return max(0, factor - 1)
STRATEGIES = (
    "surplus_wind_solar_over_load",
    "min_peak_perfect_foresight",
    "price_oriented_da_arbitrage",
)


@dataclass
class Row:
    ts: str
    load_mw: float
    wind_solar_mw: float
    residual_mw: float
    price_eur_mwh: float
    surplus_mw: float


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_rows() -> list[Row]:
    out: list[Row] = []
    with INPUT_CSV.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            load_v = float(r["load_incl_self_consumption_mw"])
            ws = float(r["wind_solar_mw"])
            out.append(
                Row(
                    ts=r["timestamp_berlin"],
                    load_mw=load_v,
                    wind_solar_mw=ws,
                    residual_mw=float(r["residual_wind_solar_mw"]),
                    price_eur_mwh=float(r["day_ahead_eur_mwh"]),
                    surplus_mw=max(0.0, ws - load_v),
                )
            )
    if len(out) != 2980:
        raise ValueError("expected 2980 intervals")
    return out


def day_key(ts: str) -> str:
    return ts[:10]


def dispatch_stats(rows: list[Row], c: np.ndarray, d: np.ndarray, e: np.ndarray, p_mw: float, e_nom: float) -> dict:
    r = np.array([x.residual_mw for x in rows])
    sur = np.array([x.surplus_mw for x in rows])
    rp = r + c - d
    absorbed_mwh = float(np.sum(c) * DT_H)
    discharged_mwh = float(np.sum(d) * DT_H)
    charged_to_battery_mwh = absorbed_mwh * ETA
    depleted_from_battery_mwh = discharged_mwh / ETA
    losses_mwh = max(0.0, charged_to_battery_mwh - depleted_from_battery_mwh)
    sim = int(np.sum((c > 1e-6) & (d > 1e-6)))
    cap = min(absorbed_mwh, float(np.sum(sur) * DT_H))
    capture_ratio = absorbed_mwh / (MONTH_SURPLUS_POOL_GWH * 1000) if MONTH_SURPLUS_POOL_GWH > 0 else 0.0
    util_surplus = absorbed_mwh / (float(np.sum(sur) * DT_H) + 1e-9)
    idx_b, idx_a = int(np.argmax(r)), int(np.argmax(rp))
    return {
        "baseline_max_residual_mw": float(np.max(r)),
        "baseline_max_residual_ts": rows[idx_b].ts,
        "after_max_residual_mw": float(np.max(rp)),
        "after_max_residual_ts": rows[idx_a].ts,
        "peak_reduction_mw": float(np.max(r) - np.max(rp)),
        "peak_reduction_pct_of_ref_64405_9": float((REF_RESIDUAL_PEAK_MW - np.max(rp)) / REF_RESIDUAL_PEAK_MW * 100),
        "grid_charge_energy_mwh": absorbed_mwh,
        "grid_charge_energy_gwh": absorbed_mwh / 1000,
        "grid_discharge_energy_mwh": discharged_mwh,
        "grid_discharge_energy_gwh": discharged_mwh / 1000,
        "grid_side_roundtrip_loss_mwh": absorbed_mwh - discharged_mwh,
        "grid_side_roundtrip_loss_gwh": (absorbed_mwh - discharged_mwh) / 1000,
        "energy_balance_residue_mwh": float(np.sum(ETA * c * DT_H - d * DT_H / ETA)),
        "simultaneous_intervals": sim,
        "max_power_violation_mw": float(max(np.max(c) - p_mw, np.max(d) - p_mw, 0.0)),
        "soc_start_mwh": float(e[0]),
        "soc_end_mwh": float(e[-1]),
        "soc_end_minus_start_mwh": float(e[-1] - e[0]),
        "soc_min_mwh": float(np.min(e)),
        "soc_max_mwh": float(np.max(e)),
        "binding_power_fraction": float(np.mean((c > 0.999 * p_mw) | (d > 0.999 * p_mw))),
        "surplus_pool_capture_grid_gwh": absorbed_mwh / 1000,
        "surplus_pool_capture_share_of_134_241975_gwh": capture_ratio,
        "surplus_pool_utilisation_of_positive_qh_energy": util_surplus,
        "model_capture_grid_gwh": absorbed_mwh / 1000,
        "model_capture_share_of_month_surplus_pool": capture_ratio,
    }


def write_series(path: Path, rows: list[Row], c, d, e, factor: int, strategy: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(
            [
                "timestamp_berlin",
                "c_mw",
                "d_mw",
                "e_start_mwh",
                "e_end_mwh",
                "load_mw",
                "wind_solar_mw",
                "surplus_wind_solar_over_load_mw",
                "R_residual_mw",
                "R_prime_mw",
                "day_ahead_eur_mwh",
                "factor",
                "strategy",
            ]
        )
        for i, row in enumerate(rows):
            e_end = e[i + 1] if i + 1 < len(e) else e[i]
            w.writerow(
                [
                    row.ts,
                    round(c[i], 4),
                    round(d[i], 4),
                    round(e[i], 6),
                    round(e_end, 6),
                    row.load_mw,
                    row.wind_solar_mw,
                    row.surplus_mw,
                    row.residual_mw,
                    round(row.residual_mw + c[i] - d[i], 4),
                    row.price_eur_mwh,
                    factor,
                    strategy,
                ]
            )


def daily_rollups(rows: list[Row], c, d, e, factor: int, strategy: str) -> list[dict]:
    by_day: dict[str, list[int]] = defaultdict(list)
    for i, row in enumerate(rows):
        by_day[day_key(row.ts)].append(i)
    daily: list[dict] = []
    for dk in sorted(by_day):
        ix = by_day[dk]
        i0, i1 = ix[0], ix[-1]
        daily.append(
            {
                "date_berlin": dk,
                "factor": factor,
                "strategy": strategy,
                "soc_start_mwh_continuous": float(e[i0]),
                "soc_end_mwh_continuous": float(e[i1 + 1]),
                "absorbed_mwh": float(np.sum(c[ix]) * DT_H),
                "discharged_mwh": float(np.sum(d[ix]) * DT_H),
                "surplus_available_mwh": float(np.sum([rows[j].surplus_mw for j in ix]) * DT_H),
                "max_R_mw": float(max(rows[j].residual_mw for j in ix)),
                "max_R_prime_mw": float(max(rows[j].residual_mw + c[j] - d[j] for j in ix)),
            }
        )
    return daily


def oct29_slice(rows: list[Row], c, d, e) -> list[dict]:
    return [
        {
            "timestamp_berlin": row.ts,
            "c_mw": float(c[i]),
            "d_mw": float(d[i]),
            "e_start_mwh": float(e[i]),
            "surplus_mw": row.surplus_mw,
            "R_mw": row.residual_mw,
            "R_prime_mw": float(row.residual_mw + c[i] - d[i]),
        }
        for i, row in enumerate(rows)
        if row.ts.startswith("2026-10-29")
    ]


def solve(rows: list[Row], factor: int, strategy: str) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    n = len(rows)
    add = additional_units(factor)
    p = BASE_POWER_MW * add
    e_nom = BASE_ENERGY_MWH * add
    residual = np.array([r.residual_mw for r in rows])
    surplus = np.array([r.surplus_mw for r in rows])
    prices = np.array([r.price_eur_mwh for r in rows])

    if add == 0:
        c = np.zeros(n)
        d = np.zeros(n)
        e = np.zeros(n + 1)
        stats = dispatch_stats(rows, c, d, e, p, e_nom)
        stats["factor"] = factor
        stats["strategy"] = strategy
        stats["p_mw"] = p
        stats["e_nominal_mwh"] = e_nom
        stats["peak_reduction_mw"] = 0.0
        stats["peak_reduction_pct_of_ref_64405_9"] = 0.0
        stats["surplus_pool_capture_share_of_134_241975_gwh"] = 0.0
        stats["solver"] = {"noop": "observed baseline ×1"}
        return c, d, e, stats

    if strategy == "surplus_wind_solar_over_load":
        m1 = MonthStorageMip(n, p, e_nom)
        c1, d1, e1, r1 = m1.solve_surplus_capture_max(surplus, residual)
        floor = float(np.sum(c1) * DT_H) - 1e-3
        m2 = MonthStorageMip(n, p, e_nom)
        c, d, e, r2 = m2.solve_surplus_capture_tiebreak_peak(surplus, residual, floor)
        rep = {"phase1": r1.__dict__, "phase2_tiebreak": r2.__dict__}
    elif strategy == "min_peak_perfect_foresight":
        m = MonthStorageMip(n, p, e_nom)
        c, d, e, r = m.solve_min_peak(residual)
        rep = {"solve": r.__dict__}
    else:
        m = MonthStorageMip(n, p, e_nom)
        c, d, e, r = m.solve_price(prices)
        rep = {"solve": r.__dict__}

    stats = dispatch_stats(rows, c, d, e, p, e_nom)
    stats["factor"] = factor
    stats["strategy"] = strategy
    stats["p_mw"] = p
    stats["e_nominal_mwh"] = e_nom
    stats["solver"] = rep
    return c, d, e, stats


def marginal_table(by_factor: dict[int, dict]) -> list[dict]:
    """Normalized incremental capture (surplus strategy only)."""
    stages = [(1, 2), (2, 5), (5, 10)]
    out = []
    for a, b in stages:
        sa = by_factor[a]["surplus_wind_solar_over_load"]
        sb = by_factor[b]["surplus_wind_solar_over_load"]
        d_cap = sb["model_capture_grid_gwh"] - sa["model_capture_grid_gwh"]
        d_p = sb["p_mw"] - sa["p_mw"]
        d_e = sb["e_nominal_mwh"] - sa["e_nominal_mwh"]
        out.append(
            {
                "from_factor": a,
                "to_factor": b,
                "delta_factor_units": b - a,
                "delta_capture_gwh": d_cap,
                "delta_capture_per_added_gw_power": d_cap / (d_p / 1000) if d_p > 0 else None,
                "delta_capture_per_added_gwh_energy": d_cap / (d_e / 1000) if d_e > 0 else None,
                "delta_peak_reduction_mw": sb["peak_reduction_mw"] - sa["peak_reduction_mw"],
                "note": "Nicht-Stufen gleich groß: ×1→×2 (+1), ×2→×5 (+3), ×5→×10 (+5)",
            }
        )
    return out


def main() -> int:
    rows = load_rows()
    surplus_check = sum(r.surplus_mw for r in rows) * DT_H / 1000
    if abs(surplus_check - MONTH_SURPLUS_POOL_GWH) > 0.002:
        print(f"WARN surplus pool {surplus_check} != reference {MONTH_SURPLUS_POOL_GWH}", file=sys.stderr)

    OUT.mkdir(parents=True, exist_ok=True)
    TS_OUT.mkdir(parents=True, exist_ok=True)
    DAY_OUT.mkdir(parents=True, exist_ok=True)
    EVENT_OUT.mkdir(parents=True, exist_ok=True)

    provenance = {
        "as_of": "2026-11-07",
        "model_fleet": {"power_mw": BASE_POWER_MW, "energy_mwh": BASE_ENERGY_MWH, "source": MODEL_FLEET_SOURCE},
        "not_claimed": "Kein amtlicher Ist-Bestand; hypothetischer Overlay auf beobachteter Last/Erzeugung.",
        "observed_curve_includes_storage_effect_uncertain": True,
        "energy_charts_battery_series": "Keine separate grid-Battery-Charging/Discharging-Serie im Oktober-EC total_power; nur hydro_pumped_storage*.",
        "baseline_R_is_observed": "residual_wind_solar_mw = load - wind - solar (CSV); kein NO-storage Back-Cast.",
        "month_surplus_pool_gwh_definition": "Modellaufnahme-Referenzpool: Σ max(0, wind+solar−load)·¼h",
        "month_surplus_pool_gwh": MONTH_SURPLUS_POOL_GWH,
        "input_sha256": {
            "csv": sha256(INPUT_CSV),
            "definitions": sha256(INPUT_DEFS),
        },
    }
    (OUT / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False), encoding="utf-8")

    all_stats: dict[int, dict[str, dict]] = {}
    for factor in FACTORS:
        all_stats[factor] = {}
        for strategy in STRATEGIES:
            slug = f"x{factor}_{strategy}"
            c, d, e, stats = solve(rows, factor, strategy)
            write_series(TS_OUT / f"{slug}.csv", rows, c, d, e, factor, strategy)
            daily = daily_rollups(rows, c, d, e, factor, strategy)
            with (DAY_OUT / f"{slug}.csv").open("w", encoding="utf-8", newline="") as fh:
                w = csv.DictWriter(fh, fieldnames=list(daily[0].keys()))
                w.writeheader()
                w.writerows(daily)
            if factor in (1, 2, 5, 10) and strategy == "surplus_wind_solar_over_load":
                (EVENT_OUT / f"oct29_{slug}.json").write_text(
                    json.dumps(oct29_slice(rows, c, d, e), indent=2), encoding="utf-8"
                )
            all_stats[factor][strategy] = stats

    margin = marginal_table(all_stats)
    # Headline from surplus ×2 vs ×10 and min_peak vs surplus on ×1
    x1 = all_stats[1]
    narrative = {
        "core_de": (
            f"Modellflotte ×1 ({BASE_POWER_MW/1000:.2f} GW / {BASE_ENERGY_MWH/1000:.0f} GWh nam.): "
            f"Surplus-Strategie nimmt netzseitig {x1['surplus_wind_solar_over_load']['model_capture_grid_gwh']:.2f} GWh "
            f"der positiven Wind-Solar-Last-Differenz auf ({x1['surplus_wind_solar_over_load']['model_capture_share_of_month_surplus_pool']*100:.1f} % des Okt-Pools {MONTH_SURPLUS_POOL_GWH:.3f} GWh). "
            f"Min-Peak-Voraussicht senkt Restlast-Max um {x1['min_peak_perfect_foresight']['peak_reduction_mw']:.1f} MW "
            f"(Preis-Arbitrage: {x1['price_oriented_da_arbitrage']['peak_reduction_mw']:.1f} MW)."
        ),
        "saturation_x10_surplus_gwh": all_stats[10]["surplus_wind_solar_over_load"]["model_capture_grid_gwh"],
        "saturation_x10_capture_share_pct": all_stats[10]["surplus_wind_solar_over_load"]["model_capture_share_of_month_surplus_pool"]
        * 100,
    }

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "factors": list(FACTORS),
        "strategies": list(STRATEGIES),
        "provenance_ref": "fleet_factor/provenance.json",
        "physics": {"rte": RTE, "eta": ETA, "dt_h": DT_H, "soc_frac": [0.1, 0.9], "soc_start_end_frac": 0.5},
        "scenarios": all_stats,
        "marginal_capture_surplus_strategy": margin,
        "narrative": narrative,
        "legacy_benchmark_note": "Ordner ../timeseries/ enthält ggf. frühere illustrative A/B/C-Portfolios (nicht Teil der ×1–×10-Flotte).",
    }
    (OUT / "summary_fleet_factors.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"ok": True, "narrative": narrative["core_de"]}, ensure_ascii=False))
    return 0


def solve_one(factor: int, strategy: str, out_dir: Path) -> int:
    rows = load_rows()
    out_dir.mkdir(parents=True, exist_ok=True)
    c, d, e, stats = solve(rows, factor, strategy)
    slug = f"x{factor}_{strategy}"
    write_series(out_dir / f"{slug}.csv", rows, c, d, e, factor, strategy)
    stats["mip_report_ref"] = stats.get("mip_report") or stats.get("phase2_tiebreak") or stats.get("solve")
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "factor": factor,
        "strategy": strategy,
        "input_csv": str(INPUT_CSV),
        "input_sha256": sha256(INPUT_CSV),
        "definitions_sha256": sha256(INPUT_DEFS),
        "intervals": len(rows),
        "stats": stats,
        "output_csv": str(out_dir / f"{slug}.csv"),
        "output_csv_sha256": sha256(out_dir / f"{slug}.csv"),
    }
    (out_dir / "solve_manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"ok": True, "manifest": str(out_dir / "solve_manifest.json"), "stats": stats}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    if "--validate-inputs" in sys.argv:
        rows = load_rows()
        print(
            json.dumps(
                {
                    "ok": True,
                    "intervals": len(rows),
                    "input_csv": str(INPUT_CSV),
                    "sha256": sha256(INPUT_CSV),
                }
            )
        )
        raise SystemExit(0)
    if "--solve-one" in sys.argv:
        try:
            fi = sys.argv.index("--factor")
            si = sys.argv.index("--strategy")
            oi = sys.argv.index("--out-dir")
        except ValueError as e:
            print("Usage: --solve-one --factor 1 --strategy min_peak_perfect_foresight --out-dir PATH", file=sys.stderr)
            raise SystemExit(2) from e
        factor = int(sys.argv[fi + 1])
        strategy = sys.argv[si + 1]
        out_dir = Path(sys.argv[oi + 1])
        if strategy not in STRATEGIES:
            raise SystemExit(f"unknown strategy {strategy}")
        raise SystemExit(solve_one(factor, strategy, out_dir))
    raise SystemExit(main())
