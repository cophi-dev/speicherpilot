#!/usr/bin/env python3
"""Independent checker for data/ort/ort-archetypes.json (Typtag + optional Jahres-Konflikte)."""

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
    bisect_x_firm,
    bisect_y_flex,
    choose_tap,
    conflict_masks,
    flow_slope,
    load_net,
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
    if key == "land" and arch["code"] not in (
        "1-MV-rural--2-no_sw",
        "1-MV-rural--1-no_sw",
        "1-MV-rural--0-no_sw",
    ):
        errors.append(f"{key}: unexpected land code {arch['code']}")
    elif key == "stadt" and arch["code"] != meta["code"]:
        errors.append(f"{key}: code mismatch {arch['code']} != {meta['code']}")

    conflicts = arch.get("conflicts12m")
    if conflicts is not None:
        errors.append(f"{key}: conflicts12m gesetzt — UX R4 erwartet null bis Jahreslieferung")

    rev = arch.get("revenuePctTyptag")
    if not rev:
        errors.append(f"{key}: revenuePctTyptag fehlt")
    elif abs(rev.get("markt", 0) - 100.0) > 0.05:
        errors.append(f"{key}: revenuePctTyptag.markt soll 100 % sein, ist {rev.get('markt')}")

    has_engpass = bool(arch.get("hasEngpass"))
    if arch["peakN1Pct"] >= 90 and not has_engpass:
        errors.append(f"{key}: peakN1Pct ≥ 90 % widerspricht hasEngpass false")
    if has_engpass and arch["peakN1Pct"] < 90 and key == "land":
        errors.append(f"{key}: peakN1Pct {arch['peakN1Pct']} < 90 bei hasEngpass")

    x, y = arch.get("xMw"), arch.get("yMw")
    show_xy = has_engpass or (x or 0) >= 0.1 or (y or 0) >= 0.1
    if not show_xy:
        if x is not None or y is not None:
            errors.append(f"{key}: ohne Engpass und ohne Band müssen xMw/yMw entfallen")
        return errors

    if y is None:
        errors.append(f"{key}: yMw fehlt trotz ausgewiesenem Band")
    if x is None:
        errors.append(f"{key}: xMw fehlt trotz ausgewiesenem Band")
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

    if rev:
        netz_rev = rev.get("netz", 0)
        netz_series = arch["series"]["modes"]["netz"]
        activity = sum(abs(v) for v in netz_series["c"]) + sum(abs(v) for v in netz_series["d"])
        if activity > 0.1 and netz_rev == 0:
            errors.append(f"{key}: netz revenue 0 % bei Speicheraktivität am Typtag")
        if netz_rev <= 0 and arch["badge"]["netz"] == "netzdienlich":
            errors.append(f"{key}: netz revenue 0 % but badge netzdienlich")

    return errors


def main(path: str | None = None) -> int:
    target = Path(path) if path else ROOT / "data" / "ort" / "ort-archetypes.json"
    payload = json.loads(target.read_text(encoding="utf-8"))
    print(f"{'key':<6} {'typtag':<12} {'X':>5} {'Y':>5} {'peak n1':>8} {'rev netz':>9}")
    all_errors: list[str] = []
    for key in ("land", "stadt"):
        arch = payload["archetypes"][key]
        x = arch["xMw"]
        y = arch["yMw"]
        rev = arch.get("revenuePctTyptag") or {}
        print(
            f"{key:<6} {arch['typtag']:<12} "
            f"{(x if x is not None else 0):>5.1f} {(y if y is not None else 0):>5.1f} "
            f"{arch.get('peakN1Pct', 0):>7.1f}% {rev.get('netz', 0):>8.1f}% "
            f"engpass={arch.get('hasEngpass')} conflicts12m={arch.get('conflicts12m')}"
        )
        all_errors.extend(check_archetype(key, arch))
    if all_errors:
        print("\nFAIL:")
        for line in all_errors:
            print(" -", line)
        return 1
    print("\nOK: Nachrechner bestätigt Typtag-Engpass, X/Y, Badge und Modellerlös.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else None))
