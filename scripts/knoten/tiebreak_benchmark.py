#!/usr/bin/env python3
"""Vorher/Nachher-Tabelle für Knoten-LP Rampen-Tiebreak."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from model import L, FLEET_P, FLEET_E, national, profiles, calibrate, node_series, solve_day, solve_day_legacy

THRESH_MW = 10.0


def count_jumps(series: list[float] | np.ndarray, thresh: float = THRESH_MW) -> int:
    arr = np.asarray(series, dtype=float)
    n = 0
    for t in range(1, len(arr)):
        prev, cur = arr[t - 1], arr[t]
        if abs(cur - prev) > thresh:
            n += 1
            continue
        if prev * cur < 0 and max(abs(prev), abs(cur)) > thresh:
            n += 1
    return n


def day_metrics(solve_fn, price, base, P, E, lim=L):
    cm, dm, Rm = solve_fn(price, base, P, E)
    ck, dk, Rk = solve_fn(price, base, P, E, lim)
    fm = base + cm - dm
    fk = base + ck - dk
    over_m = (np.abs(fm) > lim + 1e-6) & (np.abs(fm) > np.abs(base) + 1e-6)
    over_k = (np.abs(fk) > lim + 1e-6) & (np.abs(fk) > np.abs(base) + 1e-6)
    return {
        "R_markt": Rm,
        "R_knoten": Rk,
        "qh_markt": int(over_m.sum()),
        "qh_knoten": int(over_k.sum()),
        "jumps_fm": count_jumps(fm),
        "jumps_fk": count_jumps(fk),
        "fm": fm.tolist(),
        "fk": fk.tolist(),
    }


def pct_delta(a: float, b: float) -> float:
    if abs(a) < 1e-9:
        return 0.0
    return abs(b - a) / abs(a) * 100.0


def main() -> None:
    nat, price = national()
    prof = profiles(nat)
    calibrate(prof, 1.0)
    peak_nat = nat["Load"][nat["Load"].index >= __import__("pandas").Timestamp("2026-10-01", tz="Europe/Berlin")].max()
    share = L / peak_nat

    cases = [
        ("wind", "herbst", "2026-10-24", 5),
        ("stadt", "herbst", "2026-11-13", 5),
        ("wind", "herbst", "2026-10-24", 2),
    ]

    rows = []
    for node, saison, day, k in cases:
        base = node_series(node, prof, saison)
        df = __import__("pandas").DataFrame({"base": base, "p": price}).dropna()
        df["day"] = df.index.tz_convert("Europe/Berlin").date
        g = df.groupby("day").get_group(__import__("datetime").date.fromisoformat(day))
        p, bse = g.p.values, g.base.values
        P, E = k * FLEET_P * share, k * FLEET_E * share
        before = day_metrics(solve_day_legacy, p, bse, P, E)
        after = day_metrics(solve_day, p, bse, P, E)
        rows.append(
            {
                "node": node,
                "day": day,
                "k": k,
                "R_markt_vor": before["R_markt"],
                "R_markt_nach": after["R_markt"],
                "R_markt_delta_pct": pct_delta(before["R_markt"], after["R_markt"]),
                "R_knoten_vor": before["R_knoten"],
                "R_knoten_nach": after["R_knoten"],
                "R_knoten_delta_pct": pct_delta(before["R_knoten"], after["R_knoten"]),
                "qh_markt_vor": before["qh_markt"],
                "qh_markt_nach": after["qh_markt"],
                "qh_knoten_vor": before["qh_knoten"],
                "qh_knoten_nach": after["qh_knoten"],
                "jumps_fm_vor": before["jumps_fm"],
                "jumps_fm_nach": after["jumps_fm"],
                "jumps_fk_vor": before["jumps_fk"],
                "jumps_fk_nach": after["jumps_fk"],
            }
        )

    out_md = Path(__file__).resolve().parents[2] / "docs" / "knoten" / "tiebreak_vor_nach.md"
    out_md.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Knoten-LP: Rampen-Tiebreak Vorher/Nachher",
        "",
        "| Tag | k | Erlös Markt Δ% | Erlös knoten Δ% | qh Markt | qh knoten | Sprünge Markt | Sprünge knoten |",
        "|-----|---|----------------|-----------------|----------|-----------|---------------|----------------|",
    ]
    for r in rows:
        lines.append(
            f"| {r['node']} {r['day']} | ×{r['k']} | "
            f"{r['R_markt_delta_pct']:.4f} | {r['R_knoten_delta_pct']:.4f} | "
            f"{r['qh_markt_vor']}→{r['qh_markt_nach']} | {r['qh_knoten_vor']}→{r['qh_knoten_nach']} | "
            f"{r['jumps_fm_vor']}→{r['jumps_fm_nach']} | {r['jumps_fk_vor']}→{r['jumps_fk_nach']} |"
        )
    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")

    art = Path("/opt/cursor/artifacts/knoten-tiebreak-vor-nach.json")
    art.parent.mkdir(parents=True, exist_ok=True)
    art.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(out_md)
    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()