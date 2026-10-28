"""Python-Tests für das Netzmodul. Überspringt, wenn pandapower fehlt."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

pp = pytest.importorskip("pandapower")
np = pytest.importorskip("numpy")
sb = pytest.importorskip("simbench")

import nachrechner as nr
from build_netz_demo import (
    BAND,
    CASES,
    MODES,
    add_storage,
    apply_case,
    feasible,
    load_net,
    mv_buses,
    pick_nodes,
    remove_storage,
    run,
)


def _two_bus(p_mw=3.0, q_mvar=1.0, km=5.0, r_ohm=0.2, x_ohm=0.1, un=20.0):
    net = pp.create_empty_network(sn_mva=1.0)
    first = pp.create_bus(net, vn_kv=un)
    second = pp.create_bus(net, vn_kv=un)
    pp.create_ext_grid(net, first, vm_pu=1.0)
    pp.create_line_from_parameters(
        net,
        first,
        second,
        length_km=km,
        r_ohm_per_km=r_ohm,
        x_ohm_per_km=x_ohm,
        c_nf_per_km=0.0,
        max_i_ka=1.0,
    )
    pp.create_load(net, second, p_mw=p_mw, q_mvar=q_mvar)
    return net


def _formula(p_mw=3.0, q_mvar=1.0, km=5.0, r_ohm=0.2, x_ohm=0.1, un=20.0, v1=1.0):
    base_impedance = un**2 / 1.0
    resistance = r_ohm * km / base_impedance
    reactance = x_ohm * km / base_impedance
    active, reactive = p_mw, q_mvar
    mixed = v1**2 - 2 * (resistance * active + reactance * reactive)
    magnitude = np.sqrt(resistance**2 + reactance**2)
    power = np.sqrt(active**2 + reactive**2)
    voltage = np.sqrt((mixed + np.sqrt(mixed**2 - 4 * magnitude**2 * power**2)) / 2)
    current = power / voltage
    return float(voltage), float(resistance * current**2)


def test_tap_is_effective():
    net = load_net()
    assert (net.trafo.tap_changer_type == "Ratio").all()
    apply_case(net, "hL")
    low_voltage_bus = int(net.trafo.lv_bus.iloc[0])
    net.trafo["tap_pos"] = 0
    run(net)
    at_zero = float(net.res_bus.at[low_voltage_bus, "vm_pu"])
    net.trafo["tap_pos"] = -2
    run(net)
    at_minus_two = float(net.res_bus.at[low_voltage_bus, "vm_pu"])
    assert at_minus_two > at_zero + 1e-4


def test_mapping_matches_simbench_absolute_values():
    reference = load_net()
    absolute = sb.get_absolute_values(reference, profiles_instead_of_study_cases=False)
    for case in CASES:
        net = load_net()
        apply_case(net, case)
        load_p = absolute[("load", "p_mw")].loc[case].reindex(net.load.index).to_numpy()
        load_q = absolute[("load", "q_mvar")].loc[case].reindex(net.load.index).to_numpy()
        generation = absolute[("sgen", "p_mw")].loc[case].reindex(net.sgen.index).to_numpy()
        slack = float(absolute[("ext_grid", "vm_pu")].loc[case].iloc[0])
        assert np.max(np.abs(net.load.p_mw.to_numpy() - load_p)) == 0.0
        assert np.max(np.abs(net.load.q_mvar.to_numpy() - load_q)) == 0.0
        assert np.max(np.abs(net.sgen.p_mw.to_numpy() - generation)) == 0.0
        assert float(net.ext_grid.vm_pu.iloc[0]) == slack


def test_hand_calculation_matches_both_solvers():
    expected_voltage, expected_loss = _formula()
    assert expected_voltage == pytest.approx(0.991171, abs=5e-7)
    assert expected_loss == pytest.approx(0.025447, abs=5e-7)
    net = _two_bus()
    pp.runpp(net, calculate_voltage_angles=False, init="flat", tolerance_mva=1e-12)
    solved = nr.solve(net)
    panda_voltage = float(net.res_bus.vm_pu.iloc[1])
    panda_loss = float(net.res_line.pl_mw.iloc[0])
    own_voltage = float(solved["V"].loc[1])
    assert panda_voltage == pytest.approx(expected_voltage, abs=1e-6)
    assert own_voltage == pytest.approx(expected_voltage, abs=1e-6)
    assert panda_loss == pytest.approx(expected_loss, abs=1e-6)


def test_zero_storage_matches_base():
    net = load_net()
    mv = mv_buses(net)
    nodes, _distance = pick_nodes(net, mv)
    for case in CASES:
        apply_case(net, case)
        net.trafo["tap_pos"] = -2 if case == "hL" else 0
        run(net)
        base = net.res_bus.loc[mv].vm_pu.to_numpy().copy()
        for node in nodes:
            for mode in MODES:
                if mode == "laden":
                    created = pp.create_load(net, node["bus"], p_mw=0.0, q_mvar=0.0, name="Speicher")
                    table = "load"
                else:
                    created = pp.create_sgen(net, node["bus"], p_mw=0.0, q_mvar=0.0, name="Speicher")
                    table = "sgen"
                run(net)
                actual = net.res_bus.loc[mv].vm_pu.to_numpy()
                assert np.max(np.abs(actual - base)) < 1e-9
                net[table].drop(created, inplace=True)


def test_far_node_charge_does_not_converge():
    net = load_net()
    nodes, _distance = pick_nodes(net, mv_buses(net))
    far = next(node for node in nodes if node["id"] == "D")
    for case in CASES:
        apply_case(net, case)
        net.trafo["tap_pos"] = -2 if case == "hL" else 0
        handle = add_storage(net, far["bus"], "laden", 20)
        with pytest.raises(Exception):
            pp.runpp(net, numba=True, init="dc", calculate_voltage_angles=True)
        with pytest.raises(RuntimeError):
            nr.solve(net)
        remove_storage(net, handle)


def test_tipping_edge_for_five_nodes():
    payload_path = Path(__file__).resolve().parents[2] / "data" / "netz" / "netz-demo.json"
    if not payload_path.exists():
        pytest.skip("netz-demo.json fehlt")
    import json

    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    key = "hL|laden"
    pairs = [(tip, bus) for tip, bus in zip(payload["tipping"][key], payload["mvBusIds"]) if 0 < tip < 100]
    pairs.sort()
    picked = [pairs[0], pairs[1], pairs[len(pairs) // 2], pairs[-2], pairs[-1]]
    net = load_net()
    mv = mv_buses(net)
    apply_case(net, "hL")
    net.trafo["tap_pos"] = payload["taps"]["hL"]["tapPos"]
    for tip, bus in picked:
        at_tip = add_storage(net, int(bus), "laden", tip)
        assert feasible(net, mv)
        remove_storage(net, at_tip)
        above = add_storage(net, int(bus), "laden", round(tip + 0.1, 1))
        assert not feasible(net, mv)
        remove_storage(net, above)


def test_rechecker_matches_pandapower_on_base_cases():
    net = load_net()
    mv = mv_buses(net)
    for case, tap in (("hL", -2), ("lPV", 0)):
        apply_case(net, case)
        net.trafo["tap_pos"] = tap
        run(net)
        solved = nr.solve(net)
        own = np.array([solved["V"].loc[bus] for bus in mv])
        panda = net.res_bus.loc[mv].vm_pu.to_numpy()
        assert np.max(np.abs(own - panda)) <= 2e-6
        assert min(panda) >= BAND[0] - 1e-6
