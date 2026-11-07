#!/usr/bin/env python3
"""Build data/ort/ort-archetypes.json for /ort (land + stadt SimBench archetypes)."""

from __future__ import annotations

import json
import math
import os
import sys
import time
import warnings
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[2]
NETZ_DIR = ROOT / "scripts" / "netz"
sys.path.insert(0, str(NETZ_DIR))

import highspy  # noqa: E402
import networkx as nx  # noqa: E402
import numpy as np  # noqa: E402
import pandapower as pp  # noqa: E402
import simbench as sb  # noqa: E402

from build_netz_demo import (  # noqa: E402
    BAND,
    BAND_N1,
    LOAD_MAX,
    _eval_outage,
    _grid_graph,
    add_storage,
    mv_buses,
    remove_storage,
    run,
)

ETA = math.sqrt(0.85)
DT = 0.25
OUT_PATH = ROOT / "data" / "ort" / "ort-archetypes.json"
PRICES_PATH = ROOT / "data" / "fca" / "prices-12m.json"

NETZ_EPS = 0.02  # MW Strafterm gegen gleichzeitiges Laden/Entladen (netz-Modus)
VM_TOL = 1e-3  # pandapower-Rundung vs. BAND-Grenzen (Bisect X/Y)
NETZ_PRICE_PULL = 0.35  # Anteil Spot-Ziel im netz-Modus (Ertrag aus Fahrplan ≠ 0 %)

LAND_NET_CODES = (
    "1-MV-rural--2-no_sw",
    "1-MV-rural--1-no_sw",
    "1-MV-rural--0-no_sw",
)

ARCHETYPES = {
    "land": {
        "code": "1-MV-rural--2-no_sw",
        "labelDe": "Ländliches Mittelspannungsnetz (SimBench)",
        "scenarioDe": "SimBench-Zukunftsszenario mit mehr Photovoltaik-Zubau.",
        "pick": "feed_max",
        "storageMode": "entladen",
        "defaultPowerMw": 6.0,
    },
    "stadt": {
        "code": "1-MV-urban--0-no_sw",
        "labelDe": "Städtisches Mittelspannungsnetz (SimBench)",
        "pick": "max",
        "storageMode": "laden",
        "defaultPowerMw": 10.0,
    },
}


def resolve_land_code(pick: str) -> tuple[str, int, dict]:
    """Pick first rural net whose Typtag reaches ≥ 90 % n-1 on the bottleneck (else last candidate)."""
    last: tuple[str, int, dict] | None = None
    for code in LAND_NET_CODES:
        net = load_net(code)
        mv = mv_buses(net)
        abs_values = profile_absolute(net)
        day_index = typtag_day_index(abs_values, pick)
        net.trafo["tap_pos"] = choose_tap(net, mv, abs_values, day_index)
        eng = scan_engpass(net, mv, abs_values, day_index)
        last = (code, day_index, eng)
        if eng["peak_n1"] >= 90.0 - 1e-6:
            return code, day_index, eng
    assert last is not None
    return last


def load_net(code: str):
    net = sb.get_simbench_net(code)
    net.trafo["tap_changer_type"] = "Ratio"
    base = dict(lp=net.load.p_mw.copy(), lq=net.load.q_mvar.copy(), sp=net.sgen.p_mw.copy())
    net["_base"] = base
    return net


def profile_absolute(net):
    return sb.get_absolute_values(net, profiles_instead_of_study_cases=True)


def residual_by_day(abs_values) -> list[tuple[float, float, int]]:
    load_p = abs_values[("load", "p_mw")]
    gen_p = abs_values[("sgen", "p_mw")]
    residual = load_p.sum(axis=1) - gen_p.sum(axis=1)
    n_days = len(residual) // 96
    stats: list[tuple[float, float, int]] = []
    for day in range(n_days):
        chunk = residual.iloc[day * 96 : (day + 1) * 96]
        stats.append((float(chunk.min()), float(chunk.max()), day))
    return stats


def typtag_day_index(abs_values, pick: str) -> int:
    load_p = abs_values[("load", "p_mw")]
    gen_p = abs_values[("sgen", "p_mw")]
    net_import = load_p.sum(axis=1) - gen_p.sum(axis=1)
    net_export = gen_p.sum(axis=1) - load_p.sum(axis=1)
    n_days = len(net_import) // 96
    if pick == "feed_max":
        best_day = 0
        best_val = -1e18
        for day in range(n_days):
            chunk = net_export.iloc[day * 96 : (day + 1) * 96]
            value = float(chunk.max())
            if value > best_val:
                best_val = value
                best_day = day
        return best_day
    stats = residual_by_day(abs_values)
    if pick == "min":
        return min(stats, key=lambda item: item[0])[2]
    return max(stats, key=lambda item: item[1])[2]


def typtag_label(net, day_index: int) -> str:
    row = day_index * 96
    stamp = net.profiles["load"]["time"].iloc[row]
    text = str(stamp)
    if len(text) >= 10 and text[2] == ".":
        parts = text[:10].split(".")
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return text[:10]


def apply_profile_row(net, abs_values, row: int) -> None:
    net.load.p_mw = abs_values[("load", "p_mw")].iloc[row].reindex(net.load.index).fillna(0.0)
    net.load.q_mvar = abs_values[("load", "q_mvar")].iloc[row].reindex(net.load.index).fillna(0.0)
    net.sgen.p_mw = abs_values[("sgen", "p_mw")].iloc[row].reindex(net.sgen.index).fillna(0.0)


def choose_tap(net, mv, abs_values, day_index: int, qh: int = 48) -> int:
    row = day_index * 96 + qh
    best = None
    for tap in range(-9, 10):
        net.trafo["tap_pos"] = tap
        apply_profile_row(net, abs_values, row)
        try:
            run(net)
        except Exception:
            continue
        voltage = net.res_bus.loc[mv].vm_pu
        score = int(((voltage < BAND[0]) | (voltage > BAND[1])).sum())
        score += max(0.0, float(net.res_line.loading_percent.max()) - LOAD_MAX)
        score += max(0.0, float(net.res_trafo.loading_percent.max()) - LOAD_MAX)
        if best is None or score < best[0]:
            best = (score, tap)
    return 0 if best is None else int(best[1])


def element_loading(net, kind: str, index: int) -> float:
    if kind == "line":
        return float(net.res_line.at[index, "loading_percent"])
    return float(net.res_trafo.at[index, "loading_percent"])


def bottleneck_meta(net, kind: str, index: int) -> dict:
    if kind == "line":
        line = net.line.loc[index]
        return {
            "id": f"line:{int(index)}",
            "type": "line",
            "lengthKm": round(float(line.length_km), 3),
            "ratingA": round(float(line.max_i_ka) * 1000.0, 1),
        }
    trafo = net.trafo.loc[index]
    return {
        "id": f"trafo:{int(index)}",
        "type": "trafo",
        "lengthKm": None,
        "ratingA": round(float(trafo.sn_mva) * 1000.0 / (math.sqrt(3) * float(net.bus.at[int(trafo.lv_bus), "vn_kv"])), 1),
    }


def scan_engpass(net, mv, abs_values, day_index: int):
    peak_element = ("line", int(net.line.index[0]), -1.0)
    for qh in range(96):
        apply_profile_row(net, abs_values, day_index * 96 + qh)
        run(net)
        for index in net.line.index:
            value = float(net.res_line.at[index, "loading_percent"])
            if value > peak_element[2]:
                peak_element = ("line", int(index), value)
        for index in net.trafo.index:
            value = float(net.res_trafo.at[index, "loading_percent"])
            if value > peak_element[2]:
                peak_element = ("trafo", int(index), value)

    b_kind, b_idx, peak = peak_element
    l0_n0: list[float] = []
    for qh in range(96):
        apply_profile_row(net, abs_values, day_index * 96 + qh)
        run(net)
        l0_n0.append(round(element_loading(net, b_kind, b_idx), 2))
    t_star = int(np.argmax(l0_n0))
    apply_profile_row(net, abs_values, day_index * 96 + t_star)
    run(net)
    open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    critical = (None, None, -1.0)
    for kind in ("line", "trafo"):
        for index in net[kind].index:
            net[kind].at[index, "in_service"] = False
            _eval_outage(net, mv, open_switches)
            try:
                run(net)
                load_on_b = element_loading(net, b_kind, b_idx)
            except Exception:
                load_on_b = -1.0
            net[kind].at[index, "in_service"] = True
            if load_on_b > critical[2]:
                critical = (kind, int(index), load_on_b)
    k_kind, k_idx, _ = critical

    l0_n1: list[float] = []
    vm_min: list[float] = []
    vm_max: list[float] = []
    for qh in range(96):
        apply_profile_row(net, abs_values, day_index * 96 + qh)
        net[k_kind].at[k_idx, "in_service"] = False
        _eval_outage(net, mv, open_switches)
        try:
            run(net)
            value = element_loading(net, b_kind, b_idx)
            voltage = net.res_bus.loc[mv].vm_pu
            vm_min.append(round(float(voltage.min()) * 100.0, 2))
            vm_max.append(round(float(voltage.max()) * 100.0, 2))
        except Exception:
            value = float("nan")
            vm_min.append(0.0)
            vm_max.append(0.0)
        net[k_kind].at[k_idx, "in_service"] = True
        l0_n1.append(round(value, 2) if math.isfinite(value) else 0.0)

    return dict(
        b_kind=b_kind,
        b_idx=b_idx,
        b_meta=bottleneck_meta(net, b_kind, b_idx),
        k_kind=k_kind,
        k_idx=k_idx,
        t_star=t_star,
        L0_n0=l0_n0,
        L0_n1=l0_n1,
        vm_min=vm_min,
        vm_max=vm_max,
        peak_n0=max(l0_n0),
        peak_n1=max(l0_n1),
    )


def buses_upstream(net, mv, b_kind: str, b_idx: int) -> list[int]:
    busbar = int(net.trafo.lv_bus.iloc[0])
    if b_kind == "line":
        line = net.line.loc[b_idx]
        target = int(line.from_bus) if int(line.from_bus) != busbar else int(line.to_bus)
    else:
        target = int(net.trafo.at[b_idx, "lv_bus"])
    graph = _grid_graph(net)
    path = nx.shortest_path(graph, busbar, target)
    mv_ids = {int(bus) for bus in mv}
    return [int(bus) for bus in path if int(bus) in mv_ids]


def pick_storage_bus(net, mv, b_kind: str, b_idx: int) -> int:
    busbar = int(net.trafo.lv_bus.iloc[0])
    candidates = buses_upstream(net, mv, b_kind, b_idx)
    if not candidates:
        return busbar
    graph = nx.Graph()
    for index, line in net.line.iterrows():
        if line.in_service:
            weight = float(np.hypot(line.r_ohm_per_km, line.x_ohm_per_km) * line.length_km / line.parallel)
            graph.add_edge(int(line.from_bus), int(line.to_bus), w=weight)
    distance = nx.single_source_dijkstra_path_length(graph, busbar, weight="w")
    return max(candidates, key=lambda bus: distance.get(bus, 0.0))


def state_ok(net, mv) -> bool:
    try:
        run(net)
    except Exception:
        return False
    voltage = net.res_bus.loc[mv].vm_pu
    if ((voltage < BAND_N1[0] - VM_TOL) | (voltage > BAND_N1[1] + VM_TOL)).any():
        return False
    if float(net.res_line.loading_percent.max()) > LOAD_MAX:
        return False
    if float(net.res_trafo.loading_percent.max()) > LOAD_MAX:
        return False
    return True


def state_ok_n0(net, mv) -> bool:
    try:
        run(net)
    except Exception:
        return False
    voltage = net.res_bus.loc[mv].vm_pu
    if ((voltage < BAND[0] - VM_TOL) | (voltage > BAND[1] + VM_TOL)).any():
        return False
    if float(net.res_line.loading_percent.max()) > LOAD_MAX:
        return False
    if float(net.res_trafo.loading_percent.max()) > LOAD_MAX:
        return False
    return True


def with_contingency(net, mv, abs_values, day_index: int, qh_list: list[int], k_kind: str, k_idx: int, bus: int, mode: str, power: float) -> bool:
    open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    ok = True
    for qh in qh_list:
        apply_profile_row(net, abs_values, day_index * 96 + qh)
        handle = add_storage(net, bus, mode, power)
        net[k_kind].at[k_idx, "in_service"] = False
        _eval_outage(net, mv, open_switches)
        if not state_ok(net, mv):
            ok = False
        net[k_kind].at[k_idx, "in_service"] = True
        remove_storage(net, handle)
        if not ok:
            break
    return ok


def bisect_power(
    net,
    mv,
    abs_values,
    day_index: int,
    qh_list: list[int],
    k_kind: str,
    k_idx: int,
    bus: int,
    mode: str,
    *,
    n1: bool,
    hi: float = 80.0,
    tol: float = 0.1,
) -> float:
    def ok(power: float) -> bool:
        if power <= 0:
            return True
        if n1:
            return with_contingency(net, mv, abs_values, day_index, qh_list, k_kind, k_idx, bus, mode, power)
        good = True
        for qh in qh_list:
            apply_profile_row(net, abs_values, day_index * 96 + qh)
            handle = add_storage(net, bus, mode, power)
            if not state_ok_n0(net, mv):
                good = False
            remove_storage(net, handle)
            if not good:
                break
        return good

    if not ok(tol):
        return 0.0
    if ok(hi):
        return round(hi, 1)
    lower, upper = tol, hi
    while upper - lower > tol + 1e-9:
        mid = round((lower + upper) / 2.0 / tol) * tol
        if mid <= lower or mid >= upper:
            break
        if ok(mid):
            lower = mid
        else:
            upper = mid
    return round(lower, 1)


def normal_ok_at_qh(
    net,
    mv,
    abs_values,
    day_index: int,
    qh: int,
    bus: int,
    mode: str,
    power: float,
) -> bool:
    if power <= 0:
        return True
    apply_profile_row(net, abs_values, day_index * 96 + qh)
    handle = add_storage(net, bus, mode, power)
    ok = state_ok_n0(net, mv)
    remove_storage(net, handle)
    return ok


def bisect_x_firm(
    net,
    mv,
    abs_values,
    day_index: int,
    k_kind: str,
    k_idx: int,
    bus: int,
    *,
    hi: float = 80.0,
    tol: float = 0.1,
) -> float:
    qh_list = list(range(96))

    def ok(power: float) -> bool:
        if power <= 0:
            return True
        for mode in ("laden", "entladen"):
            if not with_contingency(net, mv, abs_values, day_index, qh_list, k_kind, k_idx, bus, mode, power):
                return False
        return True

    if not ok(tol):
        return 0.0
    if ok(hi):
        return round(hi, 1)
    lower, upper = tol, hi
    while upper - lower > tol + 1e-9:
        mid = round((lower + upper) / 2.0 / tol) * tol
        if mid <= lower or mid >= upper:
            break
        if ok(mid):
            lower = mid
        else:
            upper = mid
    return round(lower, 1)


def bisect_y_flex(
    net,
    mv,
    abs_values,
    day_index: int,
    bus: int,
    forbid_discharge: list[bool],
    forbid_charge: list[bool],
    *,
    hi: float = 80.0,
    tol: float = 0.1,
) -> float:
    def ok(power: float) -> bool:
        if power <= 0:
            return True
        for qh in range(96):
            apply_profile_row(net, abs_values, day_index * 96 + qh)
            if not state_ok_n0(net, mv):
                continue
            modes: list[str] = []
            if not forbid_discharge[qh]:
                modes.append("entladen")
            if not forbid_charge[qh]:
                modes.append("laden")
            for mode in modes:
                handle = add_storage(net, bus, mode, power)
                good = state_ok_n0(net, mv)
                remove_storage(net, handle)
                if not good:
                    return False
        return True

    if not ok(tol):
        return 0.0
    if ok(hi):
        return round(hi, 1)
    lower, upper = tol, hi
    while upper - lower > tol + 1e-9:
        mid = round((lower + upper) / 2.0 / tol) * tol
        if mid <= lower or mid >= upper:
            break
        if ok(mid):
            lower = mid
        else:
            upper = mid
    return round(lower, 1)


def build_l0_n1_day(
    net,
    mv,
    abs_values,
    day_index: int,
    b_kind: str,
    b_idx: int,
    k_kind: str,
    k_idx: int,
) -> list[float]:
    open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    series: list[float] = []
    for qh in range(96):
        row = day_index * 96 + qh
        apply_profile_row(net, abs_values, row)
        net[k_kind].at[k_idx, "in_service"] = False
        _eval_outage(net, mv, open_switches)
        try:
            run(net)
            value = element_loading(net, b_kind, b_idx)
        except Exception:
            value = float("nan")
        net[k_kind].at[k_idx, "in_service"] = True
        series.append(round(value, 2) if math.isfinite(value) else 0.0)
    return series


class L0N1DayCache:
    def __init__(self, net, mv, abs_values, b_kind: str, b_idx: int, k_kind: str, k_idx: int) -> None:
        self.net = net
        self.mv = mv
        self.abs_values = abs_values
        self.b_kind = b_kind
        self.b_idx = b_idx
        self.k_kind = k_kind
        self.k_idx = k_idx
        self._days: dict[int, list[float]] = {}

    def at(self, day_index: int, qh: int) -> float:
        day = day_index % max(1, len(self.abs_values[("load", "p_mw")]) // 96)
        qh96 = qh % 96
        if day not in self._days:
            self._days[day] = build_l0_n1_day(
                self.net,
                self.mv,
                self.abs_values,
                day,
                self.b_kind,
                self.b_idx,
                self.k_kind,
                self.k_idx,
            )
        return self._days[day][qh96]


def _l0_n1_day_worker(args: tuple) -> tuple[int, list[float]]:
    day_index, net_code, b_kind, b_idx, k_kind, k_idx = args
    net = load_net(net_code)
    mv = mv_buses(net)
    abs_values = profile_absolute(net)
    n_days = max(1, len(abs_values[("load", "p_mw")]) // 96)
    day = day_index % n_days
    series = build_l0_n1_day(net, mv, abs_values, day, b_kind, b_idx, k_kind, k_idx)
    return day, series


def prefetch_l0_n1_days(
    net_code: str,
    day_indices: list[int],
    b_kind: str,
    b_idx: int,
    k_kind: str,
    k_idx: int,
    *,
    label: str = "",
    workers: int | None = None,
) -> dict[int, list[float]]:
    unique = sorted(set(day_indices))
    if not unique:
        return {}
    n_workers = workers or min(4, max(1, (os.cpu_count() or 2) - 1))
    tasks = [(day_i, net_code, b_kind, b_idx, k_kind, k_idx) for day_i in unique]
    out: dict[int, list[float]] = {}
    done = 0
    print(f"  L0_n1 cache ({label}) {len(unique)} days, {n_workers} workers …", flush=True)
    with ProcessPoolExecutor(max_workers=n_workers) as pool:
        futures = {pool.submit(_l0_n1_day_worker, task): task[0] for task in tasks}
        for fut in as_completed(futures):
            day, series = fut.result()
            out[day] = series
            done += 1
            if done == 1 or done == len(unique) or done % 30 == 0:
                print(f"  L0_n1 cache ({label}): {done}/{len(unique)}", flush=True)
    return out


def build_l0_n1_year(net, mv, abs_values, b_kind: str, b_idx: int, k_kind: str, k_idx: int) -> list[float]:
    """Full-year series (slow). Prefer L0N1DayCache in build."""
    n_rows = len(abs_values[("load", "p_mw")])
    cache = L0N1DayCache(net, mv, abs_values, b_kind, b_idx, k_kind, k_idx)
    return [cache.at(row // 96, row % 96) for row in range(n_rows)]


def day_index_for_iso(net, abs_values, iso_date: str) -> int:
    suffix = iso_date[5:10] if len(iso_date) >= 10 else iso_date
    n_rows = len(abs_values[("load", "p_mw")])
    n_days = n_rows // 96
    for day in range(n_days):
        if typtag_label(net, day).endswith(suffix) or typtag_label(net, day)[5:] == suffix:
            return day
    try:
        ordinal = int(iso_date.split("-")[2])
    except (IndexError, ValueError):
        ordinal = 0
    return ordinal % max(1, n_days)


def flow_slope(net, mv, abs_values, day_index: int, qh: int, bus: int, mode: str, b_kind: str, b_idx: int, n1: bool, k_kind: str, k_idx: int) -> float:
    open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    apply_profile_row(net, abs_values, day_index * 96 + qh)
    if n1:
        net[k_kind].at[k_idx, "in_service"] = False
        _eval_outage(net, mv, open_switches)
    run(net)
    base = element_loading(net, b_kind, b_idx)
    handle = add_storage(net, bus, mode, 1.0)
    if n1:
        net[k_kind].at[k_idx, "in_service"] = False
        _eval_outage(net, mv, open_switches)
    run(net)
    stressed = element_loading(net, b_kind, b_idx)
    remove_storage(net, handle)
    if n1:
        net[k_kind].at[k_idx, "in_service"] = True
    return stressed - base


def load_prices_12m() -> list[dict]:
    payload = json.loads(PRICES_PATH.read_text(encoding="utf-8"))
    return payload["days"]


def pick_price_day(typtag: str, days: list[dict]) -> str:
    suffix = typtag[5:] if len(typtag) >= 10 else typtag
    for day in days:
        if day["date"].endswith(suffix):
            return day["date"]
    ordinal = int(typtag.split("-")[2]) if typtag.count("-") == 2 else 0
    return days[ordinal % len(days)]["date"]


def profile_row_series(abs_values, day_index: int) -> tuple[list[float], list[float]]:
    load = []
    gen = []
    for qh in range(96):
        row = day_index * 96 + qh
        load.append(float(abs_values[("load", "p_mw")].iloc[row].sum()))
        gen.append(float(abs_values[("sgen", "p_mw")].iloc[row].sum()))
    return load, gen


def conflict_masks(key: str, load: list[float], gen: list[float]) -> tuple[list[bool], list[bool]]:
    """Return (forbid_discharge, forbid_charge) per qh — simplified FCA-style rules."""
    peak_load = max(load) if load else 1.0
    forbid_discharge: list[bool] = []
    forbid_charge: list[bool] = []
    for load_mw, gen_mw in zip(load, gen):
        ratio = gen_mw / max(load_mw, 1e-6)
        residual = load_mw - gen_mw
        if key == "land":
            forbid_discharge.append(ratio > 0.30)
            forbid_charge.append(ratio < 0.10)
        else:
            forbid_discharge.append(residual < 0.5)
            forbid_charge.append(residual > 0.55 * peak_load)
    return forbid_discharge, forbid_charge


def contract_window(key: str, forbid_discharge: list[bool], forbid_charge: list[bool]) -> list[int]:
    if key == "land":
        return [qh for qh, blocked in enumerate(forbid_discharge) if not blocked]
    return [qh for qh, blocked in enumerate(forbid_charge) if not blocked]


class OrtDayModel:
    def __init__(self, n: int) -> None:
        self.n = n
        self.h = highspy.Highs()
        self.h.setOptionValue("output_flag", False)
        self.h.setOptionValue("log_to_console", False)
        a_c = ETA * DT
        a_d = -(DT / ETA)
        zeros = np.zeros(2 * n)
        ones = np.ones(2 * n)
        self.h.addCols(2 * n, zeros, zeros, ones, 0, [], [], [])
        self.h.changeObjectiveSense(highspy.ObjSense.kMaximize)
        starts = [0]
        index: list[int] = []
        value: list[float] = []
        for quarter in range(n):
            for i in range(quarter + 1):
                index.append(i)
                value.append(a_c)
                index.append(n + i)
                value.append(a_d)
            starts.append(len(index))
        self.h.addRows(n, np.full(n, -1.0), np.full(n, 1.0), len(index), starts, index, value)
        self.col_index = np.arange(2 * n, dtype=np.int32)
        self.row_index = np.arange(n, dtype=np.int32)
        self.lower = np.zeros(2 * n)
        self.upper = np.zeros(2 * n)
        self.cost = np.zeros(2 * n)
        self.row_lo = np.zeros(n)
        self.row_hi = np.zeros(n)

    def solve(self, prices: list[float], power: float, energy: float, cap_c: np.ndarray, cap_d: np.ndarray, objective: str, l0: list[float], beta: float) -> dict:
        n = self.n
        scaled = np.asarray(prices, dtype=float) * DT
        self.cost[:n] = -scaled
        self.cost[n:] = scaled
        if objective == "netz":
            weights = np.asarray([max(0.0, value - 90.0) for value in l0], dtype=float)
            if weights.sum() <= 1e-9:
                weights = np.ones(n)
            price_pull = np.asarray(scaled, dtype=float)
            pull = NETZ_PRICE_PULL * price_pull
            self.cost[:n] = weights * beta + NETZ_EPS - pull
            self.cost[n:] = -weights * beta + NETZ_EPS + pull
            self.h.changeObjectiveSense(highspy.ObjSense.kMaximize)
        else:
            self.h.changeObjectiveSense(highspy.ObjSense.kMaximize)
        self.upper[:n] = np.minimum(cap_c, power)
        self.upper[n:] = np.minimum(cap_d, power)
        self.h.changeColsCost(2 * n, self.col_index, self.cost)
        self.h.changeColsBounds(2 * n, self.col_index, self.lower, self.upper)
        s0 = 0.5 * energy
        span_down = s0 - 0.1 * energy
        span_up = 0.9 * energy - s0
        self.row_lo.fill(-span_down)
        self.row_hi.fill(span_up)
        self.row_lo[-1] = 0.0
        self.h.changeRowsBounds(n, self.row_index, self.row_lo, self.row_hi)
        self.h.run()
        sol = self.h.getSolution()
        col_values = np.array(sol.col_value)
        charge = np.asarray(col_values[:n], dtype=float)
        discharge = np.asarray(col_values[n:], dtype=float)
        for t in range(n):
            if charge[t] > 1e-6 and discharge[t] > 1e-6:
                if charge[t] >= discharge[t]:
                    discharge[t] = 0.0
                else:
                    charge[t] = 0.0
        soc = np.zeros(n + 1)
        soc[0] = s0
        for t in range(n):
            soc[t + 1] = soc[t] + ETA * DT * charge[t] - (DT / ETA) * discharge[t]
        revenue = float(np.sum(np.asarray(prices, dtype=float) * DT * (discharge - charge)))
        return {
            "c": charge.tolist(),
            "d": discharge.tolist(),
            "endSocMwh": float(soc[-1]),
            "soc": soc[:-1].tolist(),
            "revenue": 0.0 if abs(revenue) < 1e-8 else revenue,
        }


def dispatch_modes(
    key: str,
    prices: list[float],
    power: float,
    energy: float,
    l0_n0: list[float],
    l0_n1: list[float],
    beta_n0: float,
    beta_n1: float,
    forbid_discharge: list[bool],
    forbid_charge: list[bool],
    window: list[int],
    vm_min: list[float],
    vm_max: list[float],
) -> dict:
    n = len(prices)
    model = OrtDayModel(n)
    full_c = np.full(n, power)
    full_d = np.full(n, power)
    markt = model.solve(prices, power, energy, full_c, full_d, "markt", l0_n0, beta_n0)

    cap_c = np.zeros(n)
    cap_d = np.zeros(n)
    window_set = set(window)
    for qh in range(n):
        if qh in window_set:
            cap_c[qh] = 0.0 if forbid_charge[qh] else power
            cap_d[qh] = 0.0 if forbid_discharge[qh] else power
        else:
            cap_c[qh] = power
            cap_d[qh] = power
    vertrag = model.solve(prices, power, energy, cap_c, cap_d, "markt", l0_n0, beta_n0)
    netz = model.solve(prices, power, energy, full_c, full_d, "netz", l0_n1, beta_n1)

    def series(mode_result: dict) -> dict:
        c = mode_result["c"]
        d = mode_result["d"]
        l1n0 = [round(abs(l0_n0[t] + beta_n0 * (d[t] - c[t])), 2) for t in range(n)]
        l1n1 = [round(abs(l0_n1[t] + beta_n1 * (d[t] - c[t])), 2) for t in range(n)]
        return {
            "c": [round(v, 4) for v in c],
            "d": [round(v, 4) for v in d],
            "soc": [round(v, 4) for v in mode_result["soc"]],
            "L1n0": l1n0,
            "L1n1": l1n1,
            "vmin": vm_min,
            "vmax": vm_max,
        }

    return {
        "markt": {**series(markt), "revenue": markt["revenue"]},
        "vertrag": {**series(vertrag), "revenue": vertrag["revenue"]},
        "netz": {**series(netz), "revenue": netz["revenue"]},
    }


def assess_badge_v2(l0_n1: list[float], l1_n1: list[float]) -> str:
    critical = {t for t in range(min(len(l0_n1), len(l1_n1))) if l0_n1[t] >= 90 or l1_n1[t] >= 90}
    if not critical:
        return "neutral"
    for t in critical:
        if l1_n1[t] > 100 and l1_n1[t] > l0_n1[t] + 0.5:
            return "belastend"
    relief = sum((l0_n1[t] - l1_n1[t]) * DT for t in critical)
    max_l0 = max(l0_n1[t] for t in critical)
    max_l1 = max(l1_n1[t] for t in critical)
    if relief > 0 and max_l1 <= max_l0:
        return "netzdienlich"
    return "neutral"


def count_conflicts_12m(
    key: str,
    net,
    abs_values,
    l0_cache: L0N1DayCache,
    beta_n1: float,
    price_days: list[dict],
    power: float,
    energy: float,
) -> dict:
    qh_total = 0
    day_total = 0
    mwh_total = 0.0
    models: dict[int, OrtDayModel] = {}
    n_days = len(price_days)
    for day_i, day in enumerate(price_days):
        if day_i % 30 == 0:
            print(f"  conflicts {key}: day {day_i + 1}/{n_days}", flush=True)
        n = len(day["prices"])
        model = models.setdefault(n, OrtDayModel(n))
        day_index = day_index_for_iso(net, abs_values, day["date"])
        load_series, gen_series = profile_row_series(abs_values, day_index)
        forbid_discharge, forbid_charge = conflict_masks(key, load_series, gen_series)
        l0_day = [l0_cache.at(day_index, qh) for qh in range(n)]
        full_c = np.full(n, power)
        full_d = np.full(n, power)
        markt = model.solve(day["prices"], power, energy, full_c, full_d, "markt", l0_day, beta_n1)
        day_conflict = False
        for qh in range(n):
            l0 = l0_day[qh]
            d = markt["d"][qh]
            c = markt["c"][qh]
            l1 = l0 + beta_n1 * (d - c)
            if abs(l1) > 100.0 + 1e-6 and abs(l1) > abs(l0) + 1e-6:
                qh_total += 1
                mwh_total += abs(d - c) * DT
                day_conflict = True
        if day_conflict:
            day_total += 1
    return {"qh": qh_total, "days": day_total, "mwh": round(mwh_total, 2)}


def revenue_pct_12m(
    key: str,
    net,
    abs_values,
    l0_cache: L0N1DayCache,
    beta_n1: float,
    price_days: list[dict],
    power: float,
    energy: float,
    window: list[int],
) -> dict:
    models: dict[int, OrtDayModel] = {}
    totals = {"markt": 0.0, "vertrag": 0.0, "netz": 0.0}
    for day in price_days:
        n = len(day["prices"])
        model = models.setdefault(n, OrtDayModel(n))
        day_index = day_index_for_iso(net, abs_values, day["date"])
        load_series, gen_series = profile_row_series(abs_values, day_index)
        forbid_discharge, forbid_charge = conflict_masks(key, load_series, gen_series)
        l0_day = [l0_cache.at(day_index, qh) for qh in range(n)]
        full_c = np.full(n, power)
        full_d = np.full(n, power)
        markt = model.solve(day["prices"], power, energy, full_c, full_d, "markt", l0_day, beta_n1)
        cap_c = np.zeros(n)
        cap_d = np.zeros(n)
        window_set = set(i % 96 for i in window)
        for qh in range(n):
            qh96 = qh % 96
            if qh96 in window_set:
                cap_c[qh] = 0.0 if forbid_charge[qh96] else power
                cap_d[qh] = 0.0 if forbid_discharge[qh96] else power
            else:
                cap_c[qh] = power
                cap_d[qh] = power
        vertrag = model.solve(day["prices"], power, energy, cap_c, cap_d, "markt", l0_day, beta_n1)
        netz = model.solve(day["prices"], power, energy, full_c, full_d, "netz", l0_day, beta_n1)
        totals["markt"] += markt["revenue"]
        totals["vertrag"] += vertrag["revenue"]
        totals["netz"] += netz["revenue"]
    base = totals["markt"] or 1.0
    return {mode: round(100.0 * totals[mode] / base, 2) for mode in totals}


def revenue_pct_typtag(modes: dict) -> dict:
    base = modes["markt"]["revenue"] or 1.0
    return {mode: round(100.0 * modes[mode]["revenue"] / base, 2) for mode in ("markt", "vertrag", "netz")}


def has_engpass_for_archetype(key: str, eng: dict, modes: dict) -> bool:
    del key, modes
    return eng["peak_n1"] >= 90.0 - 1e-6 or max(eng["L0_n0"]) >= 90.0 - 1e-6


def build_archetype(key: str, meta: dict, price_days: list[dict]) -> dict:
    warnings_local: list[str] = []
    net_code = meta["code"]
    eng: dict | None = None
    day_index = 0
    if key == "land":
        net_code, day_index, eng = resolve_land_code(meta["pick"])
    net = load_net(net_code)
    mv = mv_buses(net)
    abs_values = profile_absolute(net)
    if eng is None:
        day_index = typtag_day_index(abs_values, meta["pick"])
        net.trafo["tap_pos"] = choose_tap(net, mv, abs_values, day_index)
        eng = scan_engpass(net, mv, abs_values, day_index)
    else:
        net.trafo["tap_pos"] = choose_tap(net, mv, abs_values, day_index)
    typtag = typtag_label(net, day_index)
    bus = pick_storage_bus(net, mv, eng["b_kind"], eng["b_idx"])
    load_series, gen_series = profile_row_series(abs_values, day_index)
    forbid_discharge, forbid_charge = conflict_masks(key, load_series, gen_series)
    mode = meta["storageMode"]
    default_power = float(meta.get("defaultPowerMw", 6.0))
    power = default_power
    energy = 2.0 * power
    price_day = pick_price_day(typtag, price_days)
    day_prices = next(item for item in price_days if item["date"] == price_day)["prices"]
    if len(day_prices) != 96:
        warnings_local.append(f"priceDay {price_day} hat {len(day_prices)} Viertelstunden")
        day_prices = (day_prices + day_prices)[:96]
    window = contract_window(key, forbid_discharge, forbid_charge)
    beta_n0 = flow_slope(
        net, mv, abs_values, day_index, eng["t_star"], bus, mode, eng["b_kind"], eng["b_idx"], False, eng["k_kind"], eng["k_idx"]
    )
    beta_n1 = flow_slope(
        net, mv, abs_values, day_index, eng["t_star"], bus, mode, eng["b_kind"], eng["b_idx"], True, eng["k_kind"], eng["k_idx"]
    )
    modes = dispatch_modes(
        key,
        day_prices,
        power,
        energy,
        eng["L0_n0"],
        eng["L0_n1"],
        beta_n0,
        beta_n1,
        forbid_discharge,
        forbid_charge,
        window,
        eng["vm_min"],
        eng["vm_max"],
    )
    has_engpass = has_engpass_for_archetype(key, eng, modes)
    x_mw: float | None = None
    y_mw: float | None = None
    x_limited = False
    print(f"  bisect X/Y ({key}) …", flush=True)
    x_mw = bisect_x_firm(net, mv, abs_values, day_index, eng["k_kind"], eng["k_idx"], bus)
    y_mw = bisect_y_flex(net, mv, abs_values, day_index, bus, forbid_discharge, forbid_charge)
    x_n0 = bisect_power(
        net, mv, abs_values, day_index, list(range(96)), eng["k_kind"], eng["k_idx"], bus, mode, n1=False
    )
    x_limited = x_n0 + 1e-6 < (x_mw or 0)
    if (x_mw or 0) < 0.1:
        if has_engpass:
            warnings_local.append(
                "Fester Anschluss X ≈ 0 MW — unter n-1 in allen Viertelstunden kein Spielraum in beiden Richtungen."
            )
    elif has_engpass:
        power = max(2.0, round(1.5 * x_mw))
        energy = 2.0 * power
        modes = dispatch_modes(
            key,
            day_prices,
            power,
            energy,
            eng["L0_n0"],
            eng["L0_n1"],
            beta_n0,
            beta_n1,
            forbid_discharge,
            forbid_charge,
            window,
            eng["vm_min"],
            eng["vm_max"],
        )
    if not has_engpass and (x_mw or 0) < 0.1 and (y_mw or 0) < 0.1:
        warnings_local.append(
            "An diesem Mustertag kein Engpass ≥ 90 % — feste und flexible Anschlussleistung (X/Y) entfallen im Modell."
        )
    badge = {
        mode: assess_badge_v2(eng["L0_n1"], modes[mode]["L1n1"]) for mode in ("markt", "vertrag", "netz")
    }
    revenue_pct = revenue_pct_typtag(modes)
    over100 = {
        "n0": sum(1 for value in eng["L0_n0"] if value > 100),
        "n1Markt": sum(1 for value in modes["markt"]["L1n1"] if value > 100),
        "n1Vertrag": sum(1 for value in modes["vertrag"]["L1n1"] if value > 100),
        "n1Netz": sum(1 for value in modes["netz"]["L1n1"] if value > 100),
    }
    scenario_de = meta.get("scenarioDe") if key == "land" else None
    return {
        "code": net_code,
        "labelDe": meta["labelDe"],
        "scenarioDe": scenario_de,
        "typtag": typtag,
        "priceDay": price_day,
        "bottleneck": eng["b_meta"],
        "contingency": {"id": f"{eng['k_kind']}:{eng['k_idx']}"},
        "node": {"id": int(bus), "label": f"MS-{int(bus)}"},
        "tStar": eng["t_star"],
        "hasEngpass": has_engpass,
        "peakN1Pct": round(eng["peak_n1"], 2),
        "xMw": x_mw,
        "yMw": y_mw,
        "xLimitedByBase": bool(x_limited),
        "storage": {"pMw": power, "eMwh": energy},
        "windowQh": window,
        "series": {
            "hour": [round((qh + 1) * DT, 2) for qh in range(96)],
            "L0n0": eng["L0_n0"],
            "L0n1": eng["L0_n1"],
            "modes": {name: {k: v for k, v in modes[name].items() if k != "revenue"} for name in modes},
        },
        "badge": badge,
        "conflicts12m": None,
        "revenuePctTyptag": revenue_pct,
        "over100Qh": over100,
        "warnings": warnings_local,
    }


def main() -> None:
    started = time.perf_counter()
    if not PRICES_PATH.exists():
        raise SystemExit(f"missing {PRICES_PATH}")
    price_days = load_prices_12m()
    payload = {
        "schemaVersion": 1,
        "generatedBy": "build_ort_archetypes.py",
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "versions": {
            "pandapower": pp.__version__,
            "simbench": sb.__version__,
            "numpy": np.__version__,
        },
        "license": {
            "name": "Open Database License (ODbL) 1.0",
            "url": "https://opendatacommons.org/licenses/odbl/1-0/",
            "notice": "Enthaelt Informationen aus der SimBench-Datenbank (https://simbench.de), die unter der Open Database License (ODbL) 1.0 steht.",
            "attribution": "SimBench: Universitaet Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE. Berechnet mit pandapower (BSD-3-Clause).",
        },
        "archetypes": {},
    }
    for key, meta in ARCHETYPES.items():
        print(f"=== build_archetype: {key} ===", flush=True)
        payload["archetypes"][key] = build_archetype(key, meta, price_days)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    elapsed = round(time.perf_counter() - started, 1)
    print(f"wrote {OUT_PATH} in {elapsed}s", flush=True)
    for key, arch in payload["archetypes"].items():
        print(
            key,
            "X/Y",
            arch["xMw"],
            arch["yMw"],
            "peak n-1",
            f"{arch['peakN1Pct']}%",
            flush=True,
        )


if __name__ == "__main__":
    main()
