#!/usr/bin/env python3
"""Erzeugt data/netz/netz-demo.json für die Seite /netz.

Netz: SimBench 1-MV-semiurb--0-no_sw. Der Stufensteller wird direkt nach dem
Laden auf tap_changer_type 'Ratio' gesetzt, sonst ignoriert pandapower 3.5.6
die Stufenstellung.

Aufruf:
    python3 scripts/netz/build_netz_demo.py data/netz/netz-demo.json

Voraussetzung: Python 3.13 und scripts/requirements-netz.txt.
"""
import json
import sys
import time
import warnings

warnings.filterwarnings("ignore")
import networkx as nx
import numpy as np
import pandas as pd
import pandapower as pp
import simbench as sb

CODE = "1-MV-semiurb--0-no_sw"
# Normalbetrieb, MS-Knoten (SimBench: bus.min_vm_pu/max_vm_pu; CIRED 2019 Fig. 2)
BAND = (0.965, 1.055)
# (n-1): zusätzlich 5 % Absenkung (CIRED 2019; SimBench-Tutorial: 0.915 und 1.055)
BAND_N1 = (0.915, 1.055)
LOAD_MAX = 100.0

CASES = ("hL", "lPV")
P_LEVELS = [0, 2, 5, 10, 20]
MODES = ["laden", "entladen"]
COMBOS = [("hL", "laden"), ("hL", "entladen"), ("lPV", "laden"), ("lPV", "entladen")]


def load_net():
    net = sb.get_simbench_net(CODE)
    # Pflicht: sonst wird tap_pos in pandapower 3.5.6 stillschweigend ignoriert.
    net.trafo["tap_changer_type"] = "Ratio"
    base = dict(lp=net.load.p_mw.copy(), lq=net.load.q_mvar.copy(), sp=net.sgen.p_mw.copy())
    net["_base"] = base
    return net


def mv_buses(net):
    return net.bus.index[net.bus.vn_kv.between(10, 30)]


def apply_case(net, case):
    base = net["_base"]
    loadcase = net.loadcases.loc[case]
    net.load.p_mw = base["lp"] * loadcase.pload
    net.load.q_mvar = base["lq"] * loadcase.qload
    types = net.sgen.type.fillna("")
    factor = np.where(
        types.str.contains("Wind"),
        loadcase.Wind_p,
        np.where(types.str.contains("PV"), loadcase.PV_p, loadcase.RES_p),
    )
    net.sgen.p_mw = base["sp"] * factor
    net.ext_grid.vm_pu = loadcase.Slack_vm


def run(net):
    pp.runpp(net, numba=True, init="dc", calculate_voltage_angles=True)


def metrics(net, mv, band=BAND):
    voltage = net.res_bus.loc[mv].vm_pu
    return dict(
        vmin=float(voltage.min()),
        vmax=float(voltage.max()),
        line=float(net.res_line.loading_percent.max()),
        trafo=float(net.res_trafo.loading_percent.max()),
        n_viol=int(((voltage < band[0]) | (voltage > band[1])).sum()),
    )


def nearest_tap(net, case, mv):
    """Stufe, bei der die MS-Sammelschiene dem SimBench-Sollwert Slack_vm am nächsten liegt."""
    apply_case(net, case)
    setpoint = net.ext_grid.vm_pu.iloc[0]
    best = None
    lv = int(net.trafo.lv_bus.iloc[0])
    for tap in range(-9, 10):
        net.trafo["tap_pos"] = tap
        run(net)
        voltage = net.res_bus.at[lv, "vm_pu"]
        distance = abs(voltage - setpoint)
        if best is None or distance < best[1] - 1e-12:
            best = (tap, distance, voltage)
    return best


def pick_nodes(net, mv):
    graph = nx.Graph()
    for index, line in net.line.iterrows():
        if not line.in_service:
            continue
        weight = float(np.hypot(line.r_ohm_per_km, line.x_ohm_per_km) * line.length_km / line.parallel)
        graph.add_edge(int(line.from_bus), int(line.to_bus), w=weight, idx=index)
    open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    for _, switch in open_switches.iterrows():
        line = net.line.loc[switch.element]
        if graph.has_edge(int(line.from_bus), int(line.to_bus)):
            graph.remove_edge(int(line.from_bus), int(line.to_bus))
    busbar = int(net.trafo.lv_bus.iloc[0])
    distance = nx.single_source_dijkstra_path_length(graph, busbar, weight="w")
    candidates = sorted((distance[bus], bus) for bus in mv if bus in distance and bus != busbar)
    count = len(candidates)
    indexes = [int(round(fraction * (count - 1))) for fraction in (0.30, 0.65, 1.00)]
    nodes = [dict(id="A", bus=busbar, name="Knoten A", zOhm=0.0, lage="Sammelschiene Umspannwerk")]
    for key, index in zip("BCD", indexes):
        nodes.append(
            dict(
                id=key,
                bus=int(candidates[index][1]),
                name=f"Knoten {key}",
                zOhm=round(float(candidates[index][0]), 2),
                lage="Strang",
            )
        )
    return nodes, distance


def build_tree(net, mv):
    """Baum über die geschlossenen Leitungen ab der Sammelschiene."""
    graph = nx.Graph()
    for index, line in net.line.iterrows():
        if line.in_service:
            graph.add_edge(int(line.from_bus), int(line.to_bus), idx=int(index))
    open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    for _, switch in open_switches.iterrows():
        line = net.line.loc[switch.element]
        if graph.has_edge(int(line.from_bus), int(line.to_bus)):
            graph.remove_edge(int(line.from_bus), int(line.to_bus))
    root = int(net.trafo.lv_bus.iloc[0])
    parent = {root: None}
    depth = {root: 0}
    strand = {root: 0}
    for number, child in enumerate(sorted(graph.neighbors(root)), 1):
        strand[child] = number
    for origin, target in nx.bfs_edges(graph, root):
        parent[target] = origin
        depth[target] = depth[origin] + 1
        strand.setdefault(target, strand[origin])
    return [
        dict(bus=int(bus), parent=parent.get(int(bus)), depth=depth.get(int(bus)), strang=strand.get(int(bus)))
        for bus in mv
    ]


def add_storage(net, bus, mode, power):
    if power == 0:
        return None
    if mode == "laden":
        return ("load", pp.create_load(net, bus, p_mw=power, q_mvar=0.0, name="Speicher"))
    return ("sgen", pp.create_sgen(net, bus, p_mw=power, q_mvar=0.0, name="Speicher"))


def remove_storage(net, handle):
    if handle:
        net[handle[0]].drop(handle[1], inplace=True)


def severity(net, mv):
    voltage = net.res_bus.loc[mv].vm_pu.dropna()
    score = (np.clip(BAND_N1[0] - voltage, 0, None) + np.clip(voltage - BAND_N1[1], 0, None)).sum()
    score += np.clip(net.res_line.loading_percent.dropna() - LOAD_MAX, 0, None).sum() / 100
    score += np.clip(net.res_trafo.loading_percent.dropna() - LOAD_MAX, 0, None).sum() / 100
    return float(score)


def _grid_graph(net):
    open_lines = set(net.switch[(net.switch.et == "l") & (~net.switch.closed)].element)
    graph = nx.Graph()
    for index in net.line.index[net.line.in_service.values]:
        if index not in open_lines:
            graph.add_edge(int(net.line.from_bus.at[index]), int(net.line.to_bus.at[index]), idx=int(index))
    return graph


def _one(net, mv):
    try:
        run(net)
    except Exception:
        return None
    voltage = net.res_bus.loc[mv].vm_pu
    unsupplied_set = set(int(bus) for bus in voltage.index[voltage.isna()])
    voltage = voltage.dropna()
    return dict(
        uset=unsupplied_set,
        vmin=float(voltage.min()),
        vmax=float(voltage.max()),
        line=float(net.res_line.loading_percent.max()),
        trafo=float(net.res_trafo.loading_percent.max()),
        unsupplied=len(unsupplied_set),
        sev=severity(net, mv),
    )


def _bad(result):
    reasons = []
    if result["unsupplied"]:
        reasons.append("Knoten ohne Versorgung")
    if result["vmin"] < BAND_N1[0] or result["vmax"] > BAND_N1[1]:
        reasons.append("Spannung")
    if result["line"] > LOAD_MAX or result["trafo"] > LOAD_MAX:
        reasons.append("Auslastung")
    return reasons


def _eval_outage(net, mv, open_switches):
    """Stufe 0: nichts schalten. Stufe 1: eine Trennstelle schließen. Stufe 2: zusätzlich eine Leitung der Schleife öffnen."""
    current = _one(net, mv)
    if current is None:
        return dict(ok=False, reason="keine Konvergenz", switch=None, relocated=None)
    best = ((current["unsupplied"], current["sev"]), None, None, current)
    if _bad(current) and len(open_switches):
        stage1 = []
        for switch_index, switch in open_switches.iterrows():
            line = net.line.loc[switch.element]
            other = int(line.to_bus if int(line.from_bus) == int(switch.bus) else line.from_bus)
            if current["unsupplied"] and ((int(switch.bus) in current["uset"]) == (other in current["uset"])):
                continue
            net.switch.at[switch_index, "closed"] = True
            switched = _one(net, mv)
            net.switch.at[switch_index, "closed"] = False
            if switched is not None:
                stage1.append((switch_index, switch, switched))
        if stage1:
            switch_index, switch, switched = min(stage1, key=lambda item: (item[2]["unsupplied"], item[2]["sev"]))
            if (switched["unsupplied"], switched["sev"]) < best[0]:
                best = ((switched["unsupplied"], switched["sev"]), int(switch_index), None, switched)
            minimum_unsupplied = min(item[2]["unsupplied"] for item in stage1)
            for switch_index, switch, switched in stage1:
                if switched["unsupplied"] != minimum_unsupplied or not _bad(switched):
                    continue
                net.switch.at[switch_index, "closed"] = True
                graph = _grid_graph(net)
                line = net.line.loc[switch.element]
                try:
                    other_path = graph.copy()
                    other_path.remove_edge(int(line.from_bus), int(line.to_bus))
                    path = nx.shortest_path(other_path, int(line.from_bus), int(line.to_bus))
                    cycle = [graph[a][b]["idx"] for a, b in zip(path, path[1:])] + [int(switch.element)]
                except Exception:
                    cycle = []
                for line_index in cycle:
                    if not net.line.at[line_index, "in_service"]:
                        continue
                    net.line.at[line_index, "in_service"] = False
                    moved = _one(net, mv)
                    net.line.at[line_index, "in_service"] = True
                    if moved is not None and (moved["unsupplied"], moved["sev"]) < best[0]:
                        best = ((moved["unsupplied"], moved["sev"]), int(switch_index), int(line_index), moved)
                net.switch.at[switch_index, "closed"] = False
    _, switch_id, relocated, chosen = best
    reasons = _bad(chosen)
    rounded = {
        key: round(value, 4) if isinstance(value, float) else value
        for key, value in chosen.items()
        if key != "uset"
    }
    return dict(ok=not reasons, reason=", ".join(reasons), switch=switch_id, relocated=relocated, **rounded)


def n1_check(net, mv, bus_of_interest=None):
    """Einzelausfälle aller Leitungen und Transformatoren. Bei einer Insel wird die beste einzelne Trennstelle geschlossen."""
    open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    elements = [("line", index) for index in net.line.index] + [("trafo", index) for index in net.trafo.index]
    results = []
    for kind, index in elements:
        net[kind].at[index, "in_service"] = False
        result = _eval_outage(net, mv, open_switches)
        net[kind].at[index, "in_service"] = True
        result.update(kind=kind, idx=int(index))
        results.append(result)
    return results


def state_result(net, mv, with_n1=True):
    try:
        run(net)
    except Exception:
        return dict(status="nicht_konvergiert", u=None, loading=None)
    measured = metrics(net, mv)
    result = dict(
        vmin=round(measured["vmin"], 4),
        vmax=round(measured["vmax"], 4),
        lineMax=round(measured["line"], 1),
        trafoMax=round(measured["trafo"], 1),
        nBusesOutOfBand=measured["n_viol"],
        u=[round(float(value), 4) for value in net.res_bus.loc[mv].vm_pu],
        loading=[round(float(value), 1) for value in net.res_line.loading_percent],
    )
    if measured["n_viol"] == 0 and measured["line"] <= 100 and measured["trafo"] <= 100:
        result["status"] = "ok"
    elif measured["n_viol"]:
        result["status"] = "Spannung"
    else:
        result["status"] = "Auslastung"
    result["pExtMw"] = round(float(net.res_ext_grid.p_mw.iloc[0]), 3)
    result["pLoadMw"] = round(float(net.res_load.p_mw.sum()), 3)
    result["pGenMw"] = round(float(net.res_sgen.p_mw.sum()), 3)
    result["lossesMw"] = round(float(net.res_line.pl_mw.sum() + net.res_trafo.pl_mw.sum()), 3)
    if with_n1 and result["status"] != "ok":
        result["n1"] = dict(checked=0, skipped="Normalbetrieb verletzt Grenzen")
    elif with_n1:
        outages = n1_check(net, mv)
        failed = [item for item in outages if not item["ok"]]
        result["n1"] = dict(
            checked=len(outages),
            failed=len(failed),
            allResupplied=all(item.get("unsupplied", 1) == 0 for item in outages),
            switched=sum(1 for item in outages if item["switch"] is not None),
            failedElements=[f"{item['kind']}:{item['idx']}" for item in failed],
            worst=(max(failed, key=lambda item: (item.get("unsupplied", 0), item.get("sev", 0))) if failed else None),
        )
    return result


def feasible(net, mv):
    try:
        run(net)
    except Exception:
        return False
    measured = metrics(net, mv)
    return measured["n_viol"] == 0 and measured["line"] <= LOAD_MAX and measured["trafo"] <= LOAD_MAX


def hosting(net, mv, bus, mode, hi=100.0, tol=0.1):
    """Größte Leistung im Raster tol, bei der der Normalbetrieb noch hält. Bisektion, Obergrenze hi."""
    handle = add_storage(net, bus, mode, 1e-6)
    table = net[handle[0]]

    def ok(power):
        table.at[handle[1], "p_mw"] = power
        return feasible(net, mv)

    if not ok(tol):
        remove_storage(net, handle)
        return 0.0
    if ok(hi):
        remove_storage(net, handle)
        return hi
    lower, upper = tol, hi
    while upper - lower > tol + 1e-9:
        mid = round((lower + upper) / 2 / tol) * tol
        if mid <= lower or mid >= upper:
            break
        if ok(mid):
            lower = mid
        else:
            upper = mid
    remove_storage(net, handle)
    return round(lower, 1)


def main(out="data/netz/netz-demo.json", with_n1=True):
    started = time.perf_counter()
    net = load_net()
    mv = mv_buses(net)
    nodes, _distance = pick_nodes(net, mv)
    taps = {}
    for case in CASES:
        tap, _distance_to_setpoint, voltage = nearest_tap(net, case, mv)
        taps[case] = dict(
            tapPos=int(tap),
            busbarPu=round(float(voltage), 4),
            setpointPu=round(float(net.loadcases.at[case, "Slack_vm"]), 3),
        )
    coordinates = {int(bus): json.loads(net.bus.at[bus, "geo"])["coordinates"] for bus in mv}
    array = np.array(list(coordinates.values()))
    low, high = array.min(0), array.max(0)
    span = float((high - low).max())
    open_lines = set(net.switch[(net.switch.et == "l") & (~net.switch.closed)].element)
    result = dict(
        schemaVersion=1,
        generatedBy="build_netz_demo.py",
        simbenchCode=CODE,
        license=dict(
            name="Open Database License (ODbL) 1.0",
            url="https://opendatacommons.org/licenses/odbl/1-0/",
            notice="Enthaelt Informationen aus der SimBench-Datenbank (https://simbench.de), die unter der Open Database License (ODbL) 1.0 steht.",
            attribution="SimBench: Universitaet Kassel, TU Dortmund, RWTH Aachen, Fraunhofer IEE. Berechnet mit pandapower (BSD-3-Clause).",
        ),
        versions=dict(pandapower=pp.__version__, simbench=sb.__version__, numpy=np.__version__),
        cases={},
        nodes=nodes,
        tree=build_tree(net, mv),
        taps=taps,
        mvBusIds=[int(bus) for bus in mv],
        busXy=[
            [
                round(float((coordinates[int(bus)][0] - low[0]) / span), 4),
                round(float((coordinates[int(bus)][1] - low[1]) / span), 4),
            ]
            for bus in mv
        ],
        lines=[
            dict(
                id=int(index),
                a=int(line.from_bus),
                b=int(line.to_bus),
                km=round(float(line.length_km), 3),
                kind=str(line.type),
                maxKa=float(line.max_i_ka),
                openEnd=bool(index in open_lines),
            )
            for index, line in net.line.iterrows()
        ],
        trafos=[dict(id=int(index), snMva=float(trafo.sn_mva)) for index, trafo in net.trafo.iterrows()],
    )
    for case in CASES:
        apply_case(net, case)
        net.trafo["tap_pos"] = taps[case]["tapPos"]
        base = state_result(net, mv, with_n1)
        result["cases"][case] = dict(base=base, scenarios=[])
        base_failed = set((base.get("n1") or {}).get("failedElements", []))
        for node in nodes:
            for mode in MODES:
                for power in P_LEVELS[1:]:
                    handle = add_storage(net, node["bus"], mode, power)
                    scenario = state_result(net, mv, with_n1)
                    remove_storage(net, handle)
                    scenario.update(node=node["id"], mode=mode, pMw=power)
                    if scenario.get("n1") and scenario["n1"].get("checked"):
                        failed = set(scenario["n1"]["failedElements"])
                        scenario["n1"]["newlyFailed"] = sorted(failed - base_failed)
                        scenario["n1"]["noLongerFailed"] = sorted(base_failed - failed)
                    if scenario.get("u"):
                        bus_index = list(map(int, mv)).index(node["bus"])
                        scenario["duNodePu"] = round(scenario["u"][bus_index] - base["u"][bus_index], 4)
                    result["cases"][case]["scenarios"].append(scenario)
                    print(
                        case,
                        node["id"],
                        mode,
                        power,
                        scenario["status"],
                        (scenario.get("n1") or {}).get("failed"),
                        round(time.perf_counter() - started),
                        "s",
                        flush=True,
                    )
    result["tipping"] = {}
    for case, mode in COMBOS:
        apply_case(net, case)
        net.trafo["tap_pos"] = taps[case]["tapPos"]
        result["tipping"][f"{case}|{mode}"] = [hosting(net, mv, int(bus), mode) for bus in mv]
        print("kipp", case, mode, round(time.perf_counter() - started), "s", flush=True)
    result["runtimeS"] = round(time.perf_counter() - started, 1)
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(result, handle, indent=None, separators=(",", ":"))
    return result


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "data/netz/netz-demo.json"
    main(out=output, with_n1=("--no-n1" not in sys.argv))
