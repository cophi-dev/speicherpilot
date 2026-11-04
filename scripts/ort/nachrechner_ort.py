#!/usr/bin/env python3
"""Independent checker for data/ort/ort-archetypes.json (R2 spec)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ORT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ORT_DIR))
sys.path.insert(0, str(ROOT / "scripts" / "netz"))

from build_ort_archetypes import (  # noqa: E402
    ARCHETYPES,
    L0N1DayCache,
    bisect_x_firm,
    bisect_y_flex,
    choose_tap,
    conflict_masks,
    count_conflicts_12m,
    flow_slope,
    load_net,
    load_prices_12m,
    mv_buses,
    pick_storage_bus,
    profile_absolute,
    profile_row_series,
    scan_engpass,
    typtag_day_index,
    typtag_label,
)


def check_archetype(key: str, arch: dict) -> list[str]:
    errors: list[str] = []
    meta = ARCHETYPES[key]
    if arch["code"] not in (meta["code"], *([] if key != "land" else ("1-MV-rural--1-no_sw", "1-MV-rural--0-no_sw"))):
        if key == "land" and arch["code"] not in (
            "1-MV-rural--2-no_sw",
            "1-MV-rural--1-no_sw",
            "1-MV-rural--0-no_sw",
        ):
            errors.append(f"{key}: unexpected land code {arch['code']}")
    elif key == "stadt" and arch["code"] != meta["code"]:
        errors.append(f"{key}: code mismatch {arch['code']} != {meta['code']}")

    has_engpass = bool(arch.get("hasEngpass"))
    if not has_engpass:
        if key == "stadt":
            errors.append(f"{key}: Stadt braucht Engpass in der Netzsicht")
        if arch.get("xMw") is not None or arch.get("yMw") is not None:
            errors.append(f"{key}: ohne Engpass müssen xMw/yMw null sein")
        if arch["peakN1Pct"] >= 90:
            errors.append(f"{key}: peakN1Pct ≥ 90 % widerspricht hasEngpass false")
        return errors

    if arch["peakN1Pct"] < 90 and key == "land":
        errors.append(f"{key}: peakN1Pct {arch['peakN1Pct']} < 90 bei hasEngpass")

    x, y = arch.get("xMw"), arch.get("yMw")
    if y is None:
        errors.append(f"{key}: yMw fehlt trotz Engpass")
    if x is None:
        errors.append(f"{key}: xMw fehlt trotz Engpass")
    if x is not None and y is not None and y + 1e-6 < x:
        errors.append(f"{key}: Y {y} < X {x}")

    net = load_net(arch["code"])
    mv = mv_buses(net)
    abs_values = profile_absolute(net)
    day_index = typtag_day_index(abs_values, meta["pick"])
    if typtag_label(net, day_index) != arch["typtag"]:
        errors.append(f"{key}: typtag mismatch")
    net.trafo["tap_pos"] = choose_tap(net, mv, abs_values, day_index)
    eng = scan_engpass(net, mv, abs_values, day_index)
    bus = pick_storage_bus(net, mv, eng["b_kind"], eng["b_idx"])
    load_series, gen_series = profile_row_series(abs_values, day_index)
    forbid_d, forbid_c = conflict_masks(key, load_series, gen_series)
    x_re = bisect_x_firm(net, mv, abs_values, day_index, eng["k_kind"], eng["k_idx"], bus)
    y_re = bisect_y_flex(net, mv, abs_values, day_index, bus, forbid_d, forbid_c)
    if x is not None and abs(x_re - x) > 0.25:
        errors.append(f"{key}: X recomputed {x_re} != file {x}")
    if y is not None and abs(y_re - y) > 0.25:
        errors.append(f"{key}: Y recomputed {y_re} != file {y}")

    beta_n1 = flow_slope(
        net,
        mv,
        abs_values,
        day_index,
        eng["t_star"],
        bus,
        meta["storageMode"],
        eng["b_kind"],
        eng["b_idx"],
        True,
        eng["k_kind"],
        eng["k_idx"],
    )
    if abs(beta_n1) < 1e-6:
        errors.append(f"{key}: beta_n1 ≈ 0 at bottleneck")

    l0_cache = L0N1DayCache(net, mv, abs_values, eng["b_kind"], eng["b_idx"], eng["k_kind"], eng["k_idx"])
    power = arch["storage"]["pMw"]
    energy = arch["storage"]["eMwh"]
    price_days = load_prices_12m()
    conflicts = count_conflicts_12m(key, net, abs_values, l0_cache, beta_n1, price_days, power, energy)
    for field in ("qh", "days", "mwh"):
        if conflicts[field] != arch["conflicts12m"][field]:
            errors.append(f"{key}: conflicts12m.{field} {arch['conflicts12m'][field]} != {conflicts[field]}")

    netz_rev = arch["revenuePct12m"]["netz"]
    if netz_rev <= 0 and arch["badge"]["netz"] == "netzdienlich":
        errors.append(f"{key}: netz revenue 0 % but badge netzdienlich")

    return errors


def main(path: str | None = None) -> int:
    target = Path(path) if path else ROOT / "data" / "ort" / "ort-archetypes.json"
    payload = json.loads(target.read_text(encoding="utf-8"))
    print(f"{'key':<6} {'typtag':<12} {'X':>5} {'Y':>5} {'peak n1':>8} {'conf qh':>8} {'days':>5} {'MWh':>10}")
    all_errors: list[str] = []
    for key in ("land", "stadt"):
        arch = payload["archetypes"][key]
        x = arch["xMw"]
        y = arch["yMw"]
        print(
            f"{key:<6} {arch['typtag']:<12} "
            f"{(x if x is not None else 0):>5.1f} {(y if y is not None else 0):>5.1f} "
            f"{arch.get('peakN1Pct', 0):>7.1f}% {arch['conflicts12m']['qh']:>8d} "
            f"{arch['conflicts12m']['days']:>5d} {arch['conflicts12m']['mwh']:>10.1f} "
            f"engpass={arch.get('hasEngpass')}"
        )
        all_errors.extend(check_archetype(key, arch))
    if all_errors:
        print("\nFAIL:")
        for line in all_errors:
            print(" -", line)
        return 1
    print("\nOK: Nachrechner bestätigt Engpass-Logik, X/Y, Konflikte und β.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else None))
