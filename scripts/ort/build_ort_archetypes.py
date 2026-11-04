#!/usr/bin/env python3
"""Build data/ort/ort-archetypes.json for /ort (land + stadt SimBench archetypes)."""

from __future__ import annotations

import json
import math
import sys
import time
import warnings
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

ARCHETYPES = {
    "land": {
        "code": "1-MV-rural--0-no_sw",
        "labelDe": "Ländliches Mittelspannungsnetz (SimBench)",
        "pick": "min",
        "storageMode": "entladen",
    },
    "stadt": {
        "code": "1-MV-urban--0-no_sw",
        "labelDe": "Städtisches Mittelspannungsnetz (SimBench)",
        "pick": "max",
        "storageMode": "laden",
    },
}


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
    l0_n0: list[float] = []
    best = ("line", int(net.line.index[0]), -1.0)
    for qh in range(96):
        apply_profile_row(net, abs_values, day_index * 96 + qh)
        run(net)
        for index in net.line.index:
            value = float(net.res_line.at[index, "loading_percent"])
            if value > best[2]:
                best = ("line", int(index), value)
        for index in net.trafo.index:
            value = float(net.res_trafo.at[index, "loading_percent"])
            if value > best[2]:
                best = ("trafo", int(index), value)
        b_kind, b_idx, _ = best
        l0_n0.append(round(element_loading(net, b_kind, b_idx), 2))

    b_kind, b_idx, peak = best
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
    for qh in range(96):
        apply_profile_row(net, abs_values, day_index * 96 + qh)
        net[k_kind].at[k_idx, "in_service"] = False
        _eval_outage(net, mv, open_switches)
        try:
            run(net)
            value = element_loading(net, b_kind, b_idx)
        except Exception:
            value = float("nan")
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
    if ((voltage < BAND_N1[0]) | (voltage > BAND_N1[1])).any():
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
    if ((voltage < BAND[0]) | (voltage > BAND[1])).any():
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


def conflict_masks_clock(key: str, n: int) -> tuple[list[bool], list[bool]]:
    """Hour-of-day conflict template for 12m scans (simplified)."""
    load = [1.0] * n
    gen = [0.2 + 0.6 * math.sin(2 * math.pi * qh / n) ** 2 for qh in range(n)]
    return conflict_masks(key, load, gen)


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
            self.cost[:n] = weights * beta
            self.cost[n:] = -weights * beta
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
        charge = col_values[:n]
        discharge = col_values[n:]
        soc = np.zeros(n + 1)
        soc[0] = s0
        for t in range(n):
            soc[t + 1] = soc[t] + ETA * DT * charge[t] - (DT / ETA) * discharge[t]
        revenue = float(self.h.getObjectiveValue())
        if objective == "netz":
            revenue = 0.0
        return {
            "c": charge.tolist(),
            "d": discharge.tolist(),
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
            cap_c[qh] = 0.0
            cap_d[qh] = 0.0
    vertrag = model.solve(prices, power, energy, cap_c, cap_d, "markt", l0_n0, beta_n0)
    netz = model.solve(prices, power, energy, full_c, full_d, "netz", l0_n0, beta_n0)

    def series(mode_result: dict) -> dict:
        c = mode_result["c"]
        d = mode_result["d"]
        l1n0 = [round(l0_n0[t] + beta_n0 * (d[t] - c[t]), 2) for t in range(n)]
        l1n1 = [round(l0_n1[t] + beta_n1 * (d[t] - c[t]), 2) for t in range(n)]
        return {
            "c": [round(v, 4) for v in c],
            "d": [round(v, 4) for v in d],
            "soc": [round(v, 4) for v in mode_result["soc"]],
            "L1n0": l1n0,
            "L1n1": l1n1,
            "vmin": l0_n0,
            "vmax": l0_n0,
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


def count_conflicts_12m(key: str, days: list[dict], power: float, energy: float) -> dict:
    qh_total = 0
    day_total = 0
    mwh_total = 0.0
    models: dict[int, OrtDayModel] = {}
    for day in days:
        n = len(day["prices"])
        model = models.setdefault(n, OrtDayModel(n))
        forbid_discharge, forbid_charge = conflict_masks_clock(key, n)
        full_c = np.full(n, power)
        full_d = np.full(n, power)
        markt = model.solve(day["prices"], power, energy, full_c, full_d, "markt", [0.0] * n, 0.0)
        window = contract_window(key, forbid_discharge, forbid_charge)
        cap_c = np.zeros(n)
        cap_d = np.zeros(n)
        for qh in range(n):
            if qh in window:
                cap_c[qh] = 0.0 if forbid_charge[qh] else power
                cap_d[qh] = 0.0 if forbid_discharge[qh] else power
        vertrag = model.solve(day["prices"], power, energy, cap_c, cap_d, "markt", [0.0] * n, 0.0)
        for qh in range(n):
            block_d = forbid_discharge[qh % len(forbid_discharge)]
            block_c = forbid_charge[qh % len(forbid_charge)]
            wants_d = markt["d"][qh] > 1e-4 and block_d
            wants_c = markt["c"][qh] > 1e-4 and block_c
            if wants_d or wants_c:
                qh_total += 1
                mwh_total += power * DT
        if any(abs(markt["d"][qh] - vertrag["d"][qh]) > 1e-3 or abs(markt["c"][qh] - vertrag["c"][qh]) > 1e-3 for qh in range(n)):
            day_total += 1
    return {"qh": qh_total, "days": day_total, "mwh": round(mwh_total, 2)}


def revenue_pct_12m(key: str, days: list[dict], power: float, energy: float, window: list[int]) -> dict:
    models: dict[int, OrtDayModel] = {}
    totals = {"markt": 0.0, "vertrag": 0.0, "netz": 0.0}
    for day in days:
        n = len(day["prices"])
        model = models.setdefault(n, OrtDayModel(n))
        forbid_discharge, forbid_charge = conflict_masks_clock(key, n)
        full_c = np.full(n, power)
        full_d = np.full(n, power)
        markt = model.solve(day["prices"], power, energy, full_c, full_d, "markt", [0.0] * n, 0.0)
        cap_c = np.zeros(n)
        cap_d = np.zeros(n)
        window_set = set(i % n for i in window)
        for qh in range(n):
            if qh in window_set:
                cap_c[qh] = 0.0 if forbid_charge[qh % 96] else power
                cap_d[qh] = 0.0 if forbid_discharge[qh % 96] else power
        vertrag = model.solve(day["prices"], power, energy, cap_c, cap_d, "markt", [0.0] * n, 0.0)
        netz = model.solve(day["prices"], power, energy, full_c, full_d, "netz", [0.0] * n, 0.0)
        totals["markt"] += markt["revenue"]
        totals["vertrag"] += vertrag["revenue"]
        totals["netz"] += netz["revenue"]
    base = totals["markt"] or 1.0
    return {mode: round(100.0 * totals[mode] / base, 2) for mode in totals}


def build_archetype(key: str, meta: dict, price_days: list[dict]) -> dict:
    warnings_local: list[str] = []
    net = load_net(meta["code"])
    mv = mv_buses(net)
    abs_values = profile_absolute(net)
    day_index = typtag_day_index(abs_values, meta["pick"])
    typtag = typtag_label(net, day_index)
    tap = choose_tap(net, mv, abs_values, day_index)
    net.trafo["tap_pos"] = tap
    eng = scan_engpass(net, mv, abs_values, day_index)
    bus = pick_storage_bus(net, mv, eng["b_kind"], eng["b_idx"])
    critical_qh = [t for t, value in enumerate(eng["L0_n0"]) if value >= 90] or [eng["t_star"]]
    mode = meta["storageMode"]
    opposite_mode = "laden" if mode == "entladen" else "entladen"
    x_n1 = bisect_power(
        net, mv, abs_values, day_index, critical_qh, eng["k_kind"], eng["k_idx"], bus, mode, n1=True
    )
    x_n0 = bisect_power(net, mv, abs_values, day_index, critical_qh, eng["k_kind"], eng["k_idx"], bus, mode, n1=False)
    x_mw = x_n1
    # Y: Kipppunkt im Normalbetrieb (n0) am Engpass — richtungsgetrennt (kritische + Gegenrichtung).
    y_critical = bisect_power(
        net, mv, abs_values, day_index, critical_qh, eng["k_kind"], eng["k_idx"], bus, mode, n1=False
    )
    y_at_tstar = bisect_power(
        net, mv, abs_values, day_index, [eng["t_star"]], eng["k_kind"], eng["k_idx"], bus, mode, n1=False
    )
    y_opposite = bisect_power(
        net, mv, abs_values, day_index, [eng["t_star"]], eng["k_kind"], eng["k_idx"], bus, opposite_mode, n1=False
    )
    y_mw = round(max(x_mw, y_critical, y_at_tstar, y_opposite), 1)
    x_limited = x_n0 + 1e-6 < x_n1
    if x_mw < 0.1:
        warnings_local.append("X unter 0,1 MW — sehr kleiner Engpass-Spielraum")
    power = max(2.0, round(1.5 * x_mw))
    energy = 2.0 * power
    price_day = pick_price_day(typtag, price_days)
    day_prices = next(item for item in price_days if item["date"] == price_day)["prices"]
    if len(day_prices) != 96:
        warnings_local.append(f"priceDay {price_day} hat {len(day_prices)} Viertelstunden")
        day_prices = (day_prices + day_prices)[:96]
    load_series, gen_series = profile_row_series(abs_values, day_index)
    forbid_discharge, forbid_charge = conflict_masks(key, load_series, gen_series)
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
    )
    badge = {
        mode: assess_badge_v2(eng["L0_n1"], modes[mode]["L1n1"]) for mode in ("markt", "vertrag", "netz")
    }
    conflicts = count_conflicts_12m(key, price_days, power, energy)
    revenue_pct = revenue_pct_12m(key, price_days, power, energy, window)
    over100 = {
        "n0": sum(1 for value in eng["L0_n0"] if value > 100),
        "n1Markt": sum(1 for value in modes["markt"]["L1n1"] if value > 100),
        "n1Vertrag": sum(1 for value in modes["vertrag"]["L1n1"] if value > 100),
        "n1Netz": sum(1 for value in modes["netz"]["L1n1"] if value > 100),
    }
    return {
        "code": meta["code"],
        "labelDe": meta["labelDe"],
        "typtag": typtag,
        "priceDay": price_day,
        "bottleneck": eng["b_meta"],
        "contingency": {"id": f"{eng['k_kind']}:{eng['k_idx']}"},
        "node": {"id": int(bus), "label": f"MS-{int(bus)}"},
        "tStar": eng["t_star"],
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
        "conflicts12m": conflicts,
        "revenuePct12m": revenue_pct,
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
        "archetypes": {
            key: build_archetype(key, meta, price_days) for key, meta in ARCHETYPES.items()
        },
    }
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
            "conflicts",
            arch["conflicts12m"]["qh"],
            flush=True,
        )


if __name__ == "__main__":
    main()
