#!/usr/bin/env python3
"""Spitzenorientierte Monatsspitze je ×-Stufe für 1,76 h / 2 h / 4 h (gleiche Nennleistung)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

from run_fleet_factor_month import BASE_POWER_MW, FACTORS, load_rows, solve

NOMINAL_DURATION_H = 8150.0 / BASE_POWER_MW
DURATION_LABELS = ("1.76", "2", "4")


def energy_nominal_mwh(factor: int, duration_h: float) -> float:
    p = BASE_POWER_MW * factor
    if abs(duration_h - NOMINAL_DURATION_H) < 0.02:
        return 8150.0 * factor
    return p * duration_h


def solve_spitze_duration(rows, factor: int, duration_h: float) -> float:
    p = BASE_POWER_MW * factor
    e_nom = energy_nominal_mwh(factor, duration_h)
    residual = np.array([r.residual_mw for r in rows])
    from mip_month import MonthStorageMip

    m = MonthStorageMip(len(rows), p, e_nom)
    c, d, e, _ = m.solve_min_peak(residual)
    rp = residual + c - d
    return float((np.max(residual) - np.max(rp)) / 1000)


def main() -> int:
    rows = load_rows()
    durs = (NOMINAL_DURATION_H, 2.0, 4.0)
    out: dict = {"factors": list(FACTORS), "durations_h": list(durs), "peak_reduction_gw": {}}
    for factor in FACTORS:
        out["peak_reduction_gw"][str(factor)] = {}
        for label, dur in zip(DURATION_LABELS, durs):
            gw = solve_spitze_duration(rows, factor, dur)
            out["peak_reduction_gw"][str(factor)][label] = round(gw, 4)
    path = Path(__file__).resolve().parents[2] / "data/national-fleet/2026-10/duration-sensitivity.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "path": str(path)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
