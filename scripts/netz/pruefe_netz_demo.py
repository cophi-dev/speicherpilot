#!/usr/bin/env python3
"""Prüft data/netz/netz-demo.json mit dem eigenen Newton-Raphson und mit JSON-Invarianten.

Aufruf: python3 scripts/netz/pruefe_netz_demo.py data/netz/netz-demo.json
Schreibt die gemessenen Abweichungen nach data/netz/pruefung.json.
Bricht ab, wenn ein gespeicherter Zustand bei pandapower nicht konvergiert, der
Nachrechner aber schon, oder wenn eine Toleranz aus der Bauspezifikation verletzt ist.
"""
import json
import sys
from pathlib import Path

import numpy as np

from build_netz_demo import add_storage, apply_case, load_net, mv_buses, remove_storage
import nachrechner as nr

DU_MAX = 1e-4
DLINE_MAX = 0.06
DTRAFO_MAX = 0.06
DP_MAX = 1e-3
BALANCE_NR_MAX = 1e-9
BALANCE_JSON_MAX = 2e-3


def check_state(net, mv, state, tag, worst):
    if state["status"] == "nicht_konvergiert":
        try:
            nr.solve(net)
        except RuntimeError:
            worst["n"] += 1
            return
        raise SystemExit(f"{tag}: pandapower nicht konvergiert, eigener NR schon -> pruefen")
    solved = nr.solve(net)
    line_loading, trafo_loading = nr.loadings(net, solved)
    voltage_error = float(np.abs(np.array([solved["V"].loc[bus] for bus in mv]) - np.array(state["u"])).max())
    line_error = float(np.abs(np.array([line_loading[index] for index in net.line.index]) - np.array(state["loading"])).max())
    trafo_error = abs(max(trafo_loading.values()) - state["trafoMax"])
    slack_error = abs(solved["p_slack_mw"] - state["pExtMw"])
    generation = net.sgen.p_mw[net.sgen.in_service].sum()
    load = net.load.p_mw[net.load.in_service].sum()
    balance_nr = abs(solved["p_slack_mw"] + generation - load - solved["losses_mw"])
    balance_json = abs(state["pExtMw"] + state["pGenMw"] - state["pLoadMw"] - state["lossesMw"])
    worst["du"] = max(worst["du"], voltage_error)
    worst["dLine"] = max(worst["dLine"], line_error)
    worst["dTrafo"] = max(worst["dTrafo"], trafo_error)
    worst["dP"] = max(worst["dP"], slack_error)
    worst["balanceNR"] = max(worst["balanceNR"], balance_nr)
    worst["balanceJson"] = max(worst["balanceJson"], balance_json)
    worst["n"] += 1


def main(path):
    payload = json.load(open(path, encoding="utf-8"))
    net = load_net()
    mv = mv_buses(net)
    bus_ids = payload["mvBusIds"]
    if [int(bus) for bus in mv] != bus_ids:
        raise SystemExit("mvBusIds weicht vom geladenen Netz ab")
    nodes = {node["id"]: node["bus"] for node in payload["nodes"]}
    worst = dict(n=0, du=0.0, dLine=0.0, dTrafo=0.0, dP=0.0, balanceNR=0.0, balanceJson=0.0)
    for case, tap in payload["taps"].items():
        apply_case(net, case)
        net.trafo["tap_pos"] = tap["tapPos"]
        check_state(net, mv, payload["cases"][case]["base"], f"{case} base", worst)
        for scenario in payload["cases"][case]["scenarios"]:
            handle = add_storage(net, nodes[scenario["node"]], scenario["mode"], scenario["pMw"])
            check_state(net, mv, scenario, f"{case} {scenario['node']} {scenario['mode']} {scenario['pMw']}", worst)
            remove_storage(net, handle)
    measured = {key: float(f"{value:.3e}") for key, value in worst.items() if key != "n"}
    print("Zustaende gegengerechnet:", worst["n"], measured)

    conflicts = 0
    for case, block in payload["cases"].items():
        for scenario in block["scenarios"]:
            if scenario["status"] == "nicht_konvergiert":
                continue
            tip = payload["tipping"][f"{case}|{scenario['mode']}"][bus_ids.index(nodes[scenario["node"]])]
            if (scenario["status"] == "ok") != (scenario["pMw"] <= tip + 1e-9):
                conflicts += 1
                print(
                    "Widerspruch Kipppunkt/Szenario:",
                    case,
                    scenario["node"],
                    scenario["mode"],
                    scenario["pMw"],
                    scenario["status"],
                    tip,
                )
    print("Kipppunkt-Konsistenz, Widersprueche:", conflicts)

    report = {
        "states": worst["n"],
        "duPu": worst["du"],
        "dLinePct": worst["dLine"],
        "dTrafoPct": worst["dTrafo"],
        "dPMw": worst["dP"],
        "balanceNrMw": worst["balanceNR"],
        "balanceJsonMw": worst["balanceJson"],
        "tippingConflicts": conflicts,
    }
    report_path = Path(path).with_name("pruefung.json")
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("geschrieben", report_path)

    failures = []
    if worst["du"] > DU_MAX:
        failures.append(f"Spannung {worst['du']:.3e} > {DU_MAX:.0e}")
    if worst["dLine"] > DLINE_MAX:
        failures.append(f"Leitung {worst['dLine']:.3e} > {DLINE_MAX}")
    if worst["dTrafo"] > DTRAFO_MAX:
        failures.append(f"Trafo {worst['dTrafo']:.3e} > {DTRAFO_MAX}")
    if worst["dP"] > DP_MAX:
        failures.append(f"Bezug {worst['dP']:.3e} > {DP_MAX:.0e}")
    if worst["balanceNR"] > BALANCE_NR_MAX:
        failures.append(f"Bilanz NR {worst['balanceNR']:.3e} > {BALANCE_NR_MAX:.0e}")
    if worst["balanceJson"] > BALANCE_JSON_MAX:
        failures.append(f"Bilanz JSON {worst['balanceJson']:.3e} > {BALANCE_JSON_MAX:.0e}")
    if conflicts:
        failures.append(f"Kipppunkt-Widersprueche {conflicts}")
    if failures:
        raise SystemExit("Toleranz verletzt: " + "; ".join(failures))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/netz/netz-demo.json")
