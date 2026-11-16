#!/usr/bin/env python3
"""JSON-stdin/-stdout LP (identisch lib/research/nationalStorageLp + mip_month._solve_peak_flat_lp)."""
from __future__ import annotations

import json
import math
import sys

import numpy as np

from mip_month import (
    CHARGE_SMOOTH_MWH_PER_MW_RAMP,
    DT_H,
    ETA,
    PEAK_LEX_TOLERANCE_MW,
    _solve_peak_flat_lp,
)


def _solve_peak(residual: list[float], p_mw: float, e_nom: float) -> dict:
    from scipy.optimize import linprog
    from scipy.sparse import csr_matrix

    R = np.asarray(residual, dtype=float)
    T = len(R)
    if p_mw <= 0 or e_nom <= 0 or T == 0:
        return {
            "cMw": [0.0] * T,
            "dMw": [0.0] * T,
            "peakMw": float(max(R) if T else 0),
            "status": "trivial",
        }
    e_min, e_max, e_start = 0.1 * e_nom, 0.9 * e_nom, 0.5 * e_nom
    ic, id_, ie, iM = 0, T, 2 * T, 3 * T + 1
    n = 3 * T + 2
    cost = np.zeros(n)
    cost[iM] = 1.0
    rows, cols, data = [], [], []
    for t in range(T):
        rows += [t, t, t, t]
        cols += [ie + t + 1, ie + t, ic + t, id_ + t]
        data += [1.0, -1.0, -ETA * DT_H, DT_H / ETA]
    Aeq = csr_matrix((data, (rows, cols)), shape=(T, n))
    beq = np.zeros(T)
    rows, cols, data = [], [], []
    for t in range(T):
        rows += [t, t, t]
        cols += [ic + t, id_ + t, iM]
        data += [1.0, -1.0, -1.0]
    Aub = csr_matrix((data, (rows, cols)), shape=(T, n))
    bub = -R
    bounds = [(0.0, p_mw)] * T + [(0.0, p_mw)] * T
    bounds.append((e_start, e_start))
    bounds.extend([(e_min, e_max)] * (T - 1))
    bounds.append((e_start, e_start))
    lo_m = float(R.min() - p_mw - 1)
    bounds.append((lo_m, float(R.max() + p_mw + 1)))
    res = linprog(
        cost,
        A_ub=Aub,
        b_ub=bub,
        A_eq=Aeq,
        b_eq=beq,
        bounds=bounds,
        method="highs",
        options={"presolve": True, "time_limit": 120.0},
    )
    if not res.success:
        raise RuntimeError(res.message)
    x = res.x
    c = x[ic : ic + T]
    d = x[id_ : id_ + T]
    rp = R + c - d
    return {
        "cMw": [float(v) for v in c],
        "dMw": [float(v) for v in d],
        "peakMw": float(np.max(rp)),
        "peakStage1Mw": float(np.max(rp)),
        "status": "optimal",
    }


def main() -> int:
    payload = json.load(sys.stdin)
    mode = payload["mode"]
    residual = payload["residualMw"]
    p_mw = float(payload["powerMw"])
    e_nom = float(payload["energyMwh"])
    if mode == "peak":
        out = _solve_peak(residual, p_mw, e_nom)
    elif mode == "peak_flat":
        peak_ub = float(payload["peakUbMw"])
        c, d, _e, rep = _solve_peak_flat_lp(np.asarray(residual), p_mw, e_nom, peak_ub)
        rp = np.asarray(residual) + c - d
        out = {
            "cMw": [float(v) for v in c],
            "dMw": [float(v) for v in d],
            "peakMw": float(np.max(rp)),
            "status": rep.status,
        }
    elif mode == "peak_lex":
        s1 = _solve_peak(residual, p_mw, e_nom)
        peak_ub = s1["peakMw"] + PEAK_LEX_TOLERANCE_MW
        c, d, _e, rep = _solve_peak_flat_lp(np.asarray(residual), p_mw, e_nom, peak_ub)
        rp = np.asarray(residual) + c - d
        out = {
            "cMw": [float(v) for v in c],
            "dMw": [float(v) for v in d],
            "peakMw": float(np.max(rp)),
            "peakStage1Mw": s1["peakMw"],
            "peakToleranceMw": PEAK_LEX_TOLERANCE_MW,
            "smoothMwhPerMwRamp": CHARGE_SMOOTH_MWH_PER_MW_RAMP,
            "status": rep.status,
        }
    else:
        raise ValueError(f"unknown mode {mode}")
    json.dump(out, sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())