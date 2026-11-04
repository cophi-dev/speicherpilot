"""Tests for Ort archetype builder (light + optional integration)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
ORT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ORT_DIR))

from build_ort_archetypes import (  # noqa: E402
    ARCHETYPES,
    assess_badge_v2,
    bisect_power,
    conflict_masks,
    contract_window,
    pick_price_day,
    typtag_day_index,
)


def test_typtag_land_feed_stadt_max():
    sb = pytest.importorskip("simbench")
    import warnings

    warnings.filterwarnings("ignore")
    from build_ort_archetypes import load_net, profile_absolute, typtag_day_index

    for key in ("land", "stadt"):
        meta = ARCHETYPES[key]
        net = load_net(meta["code"])
        abs_values = profile_absolute(net)
        pick = meta["pick"]
        day = typtag_day_index(abs_values, pick)
        load_p = abs_values[("load", "p_mw")]
        gen_p = abs_values[("sgen", "p_mw")]
        n_days = len(load_p) // 96
        if pick == "feed_max":
            best_day = 0
            best_val = -1e18
            for d in range(n_days):
                chunk = gen_p.iloc[d * 96 : (d + 1) * 96].sum(axis=1) - load_p.iloc[d * 96 : (d + 1) * 96].sum(axis=1)
                value = float(chunk.max())
                if value > best_val:
                    best_val = value
                    best_day = d
            assert day == best_day
        elif pick == "max":
            residual = load_p.sum(axis=1) - gen_p.sum(axis=1)
            stats = []
            for d in range(n_days):
                chunk = residual.iloc[d * 96 : (d + 1) * 96]
                stats.append((float(chunk.min()), float(chunk.max()), d))
            assert day == max(stats, key=lambda item: item[1])[2]
        else:
            pytest.fail(f"unexpected pick {pick}")


def test_t_star_within_day():
    payload_path = ROOT / "data" / "ort" / "ort-archetypes.json"
    if not payload_path.exists():
        pytest.skip("ort-archetypes.json missing")
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    for key in ("land", "stadt"):
        arch = payload["archetypes"][key]
        assert 0 <= arch["tStar"] < 96
        assert len(arch["series"]["L0n0"]) == 96
        assert len(arch["series"]["L0n1"]) == 96
        assert arch["series"]["L0n0"][arch["tStar"]] == pytest.approx(max(arch["series"]["L0n0"]), abs=0.05)


def test_x_bisection_monotone():
    def ok(p: float) -> bool:
        return p <= 2.0

    # mirror bisection logic without pandapower
    tol = 0.1
    hi = 5.0
    lower, upper = tol, hi
    while upper - lower > tol + 1e-9:
        mid = round((lower + upper) / 2.0 / tol) * tol
        if mid <= lower or mid >= upper:
            break
        if ok(mid):
            lower = mid
        else:
            upper = mid
    assert lower == pytest.approx(2.0, abs=tol)


def test_conflict_toy_data():
    load = [2.0, 2.0, 1.0, 1.0]
    gen = [0.1, 1.5, 0.1, 0.1]
    forbid_d, forbid_c = conflict_masks("land", load, gen)
    assert forbid_d == [False, True, False, False]
    assert forbid_c == [True, False, False, False]
    window = contract_window("land", forbid_d, forbid_c)
    assert 1 not in window
    assert 0 in window


def test_badge_v2_relief():
    l0 = [95.0, 92.0, 50.0]
    l1 = [90.0, 88.0, 50.0]
    assert assess_badge_v2(l0, l1) == "netzdienlich"


def test_pick_price_day_suffix():
    days = [{"date": "2025-05-29", "prices": [0.0] * 96}, {"date": "2026-01-01", "prices": [1.0] * 96}]
    assert pick_price_day("2016-05-29", days) == "2025-05-29"


def test_nachrechner_ok():
    payload_path = ROOT / "data" / "ort" / "ort-archetypes.json"
    if not payload_path.exists():
        pytest.skip("ort-archetypes.json missing")
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    if not payload["archetypes"]["land"].get("hasEngpass"):
        pytest.skip("land JSON interim without engpass — run pnpm run data:ort when build finishes")
    import subprocess

    result = subprocess.run(
        [sys.executable, str(ORT_DIR / "nachrechner_ort.py"), str(payload_path)],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        timeout=3600,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_bisect_power_zero_when_infeasible():
    pp = pytest.importorskip("pandapower")
    del pp  # only check import
    sb = pytest.importorskip("simbench")
    del sb
    import warnings

    warnings.filterwarnings("ignore")
    from build_ort_archetypes import load_net, mv_buses, profile_absolute

    net = load_net(ARCHETYPES["land"]["code"])
    mv = mv_buses(net)
    abs_values = profile_absolute(net)
    value = bisect_power(
        net,
        mv,
        abs_values,
        0,
        [0],
        "line",
        99999,
        int(net.bus.index[0]),
        "entladen",
        n1=True,
        hi=1.0,
    )
    assert value == 0.0
