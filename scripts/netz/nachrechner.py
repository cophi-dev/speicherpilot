"""Unabhängiger Nachrechner.

Baut die Knoten-Admittanzmatrix selbst aus den Tabellen und löst mit eigenem
Newton-Raphson in numpy. Von pandapower werden nur die Daten gelesen
(net.line, net.trafo, net.load, net.sgen, net.ext_grid, net.switch), nicht der Löser.
"""
import numpy as np
import pandas as pd

SBASE = 1.0  # MVA


def build(net, f_hz=50.0):
    buses = [bus for bus in net.bus.index if net.bus.at[bus, "in_service"]]
    if len(net.switch):
        open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    else:
        open_switches = net.switch
    # Offene Trennstelle: die Leitung hängt nur am anderen Ende. Das offene Ende
    # wird ein Hilfsknoten, damit der Ladestrom weiter fließt.
    auxiliary = {}
    for _, switch in open_switches.iterrows():
        line = net.line.loc[switch.element]
        if line.in_service:
            auxiliary[int(switch.element)] = (int(switch.bus), f"aux{int(switch.element)}")
    names = buses + [item[1] for item in auxiliary.values()]
    index = {bus: position for position, bus in enumerate(names)}
    count = len(names)
    nominal = np.array(
        [net.bus.at[bus, "vn_kv"] if not isinstance(bus, str) else 0 for bus in names],
        float,
    )
    for line_index, (side_bus, name) in auxiliary.items():
        nominal[index[name]] = net.bus.at[side_bus, "vn_kv"]
    admittance = np.zeros((count, count), complex)
    for line_index, line in net.line.iterrows():
        if not line.in_service:
            continue
        from_bus, to_bus = int(line.from_bus), int(line.to_bus)
        if line_index in auxiliary:
            side_bus, name = auxiliary[line_index]
            if side_bus == from_bus:
                from_bus = name
            else:
                to_bus = name
        from_index, to_index = index[from_bus], index[to_bus]
        base_impedance = nominal[from_index] ** 2 / SBASE
        series = (line.r_ohm_per_km + 1j * line.x_ohm_per_km) * line.length_km / line.parallel / base_impedance
        shunt = (
            (line.g_us_per_km * 1e-6 + 1j * 2 * np.pi * f_hz * line.c_nf_per_km * 1e-9)
            * line.length_km
            * line.parallel
            * base_impedance
        )
        series_admittance = 1 / series
        admittance[from_index, from_index] += series_admittance + shunt / 2
        admittance[to_index, to_index] += series_admittance + shunt / 2
        admittance[from_index, to_index] -= series_admittance
        admittance[to_index, from_index] -= series_admittance
    for _, trafo in net.trafo.iterrows():
        if not trafo.in_service:
            continue
        high = index[int(trafo.hv_bus)]
        low = index[int(trafo.lv_bus)]
        rated = trafo.sn_mva * trafo.parallel
        short_circuit = trafo.vk_percent / 100 * SBASE / rated
        resistance = trafo.vkr_percent / 100 * SBASE / rated
        reactance = np.sqrt(short_circuit**2 - resistance**2)
        series_admittance = 1 / (resistance + 1j * reactance)
        magnetising = trafo.i0_percent / 100 * rated / SBASE
        conductance = trafo.pfe_kw / 1000 / SBASE
        susceptance = -np.sqrt(max(magnetising**2 - conductance**2, 0))
        magnetising_admittance = conductance + 1j * susceptance
        ratio = 1 + (trafo.tap_pos - trafo.tap_neutral) * trafo.tap_step_percent / 100
        admittance[high, high] += series_admittance / ratio**2 + magnetising_admittance / 2 / ratio**2
        admittance[low, low] += series_admittance + magnetising_admittance / 2
        admittance[high, low] -= series_admittance / ratio
        admittance[low, high] -= series_admittance / ratio
    return names, index, admittance


def injections(net, index, count):
    power = np.zeros(count, complex)
    for _, row in net.load.iterrows():
        if row.in_service:
            power[index[int(row.bus)]] -= (row.p_mw + 1j * row.q_mvar) * row.scaling / SBASE
    for _, row in net.sgen.iterrows():
        if row.in_service:
            power[index[int(row.bus)]] += (row.p_mw + 1j * row.q_mvar) * row.scaling / SBASE
    return power


def solve(net, tol=1e-10, maxit=30):
    buses, index, admittance = build(net)
    count = len(buses)
    specified = injections(net, index, count)
    slack = index[int(net.ext_grid.bus.iloc[0])]
    voltage = np.ones(count, complex)
    voltage[slack] = net.ext_grid.vm_pu.iloc[0]
    connected = np.abs(admittance) > 0
    reached = {slack}
    stack = [slack]
    while stack:
        origin = stack.pop()
        for target in np.nonzero(connected[origin])[0]:
            target = int(target)
            if target not in reached:
                reached.add(target)
                stack.append(target)
    active = sorted(reached)
    pq = [bus for bus in active if bus != slack]
    for iteration in range(maxit):
        current = admittance @ voltage
        calculated = voltage * np.conj(current)
        mismatch = np.concatenate([(specified - calculated).real[pq], (specified - calculated).imag[pq]])
        if np.abs(mismatch).max() < tol:
            break
        magnitude = np.abs(voltage)
        angle = np.angle(voltage)
        injected = admittance @ voltage
        d_power_d_angle = 1j * np.diag(voltage) @ np.conj(np.diag(injected) - admittance @ np.diag(voltage))
        d_power_d_magnitude = np.diag(voltage) @ np.conj(admittance @ np.diag(voltage / magnitude)) + np.conj(
            np.diag(injected)
        ) @ np.diag(voltage / magnitude)
        jacobian = np.block(
            [
                [d_power_d_angle.real[np.ix_(pq, pq)], d_power_d_magnitude.real[np.ix_(pq, pq)]],
                [d_power_d_angle.imag[np.ix_(pq, pq)], d_power_d_magnitude.imag[np.ix_(pq, pq)]],
            ]
        )
        step = np.linalg.solve(jacobian, mismatch)
        angle[pq] += step[: len(pq)]
        magnitude[pq] += step[len(pq) :]
        voltage = magnitude * np.exp(1j * angle)
    else:
        raise RuntimeError("keine Konvergenz")
    current = admittance @ voltage
    calculated = voltage * np.conj(current)
    return dict(
        Vc=voltage,
        idx=index,
        names=buses,
        V=pd.Series(np.abs(voltage), index=buses),
        supplied=pd.Series([position in reached for position in range(count)], index=buses),
        iters=iteration,
        p_slack_mw=float(calculated[slack].real * SBASE),
        q_slack_mvar=float(calculated[slack].imag * SBASE),
        p_load_mw=float(-specified.real[active].sum()),
        losses_mw=float(calculated.real[active].sum() * SBASE),
    )


def loadings(net, result, f_hz=50.0):
    """Strombezogene Auslastung je Leitung und Transformator aus den Knotenspannungen."""
    voltage = result["Vc"]
    index = result["idx"]
    if len(net.switch):
        open_switches = net.switch[(net.switch.et == "l") & (~net.switch.closed)]
    else:
        open_switches = net.switch
    auxiliary = {
        int(switch.element): (int(switch.bus), f"aux{int(switch.element)}")
        for _, switch in open_switches.iterrows()
        if net.line.at[switch.element, "in_service"]
    }
    line_loading = {}
    for line_index, line in net.line.iterrows():
        if not line.in_service:
            line_loading[line_index] = 0.0
            continue
        from_bus, to_bus = int(line.from_bus), int(line.to_bus)
        if line_index in auxiliary:
            side_bus, name = auxiliary[line_index]
            if side_bus == from_bus:
                from_bus = name
            else:
                to_bus = name
        from_index, to_index = index[from_bus], index[to_bus]
        nominal = net.bus.at[int(line.from_bus), "vn_kv"]
        base_impedance = nominal**2 / SBASE
        base_current = SBASE / (np.sqrt(3) * nominal)
        series = (line.r_ohm_per_km + 1j * line.x_ohm_per_km) * line.length_km / line.parallel / base_impedance
        shunt = (
            (line.g_us_per_km * 1e-6 + 1j * 2 * np.pi * f_hz * line.c_nf_per_km * 1e-9)
            * line.length_km
            * line.parallel
            * base_impedance
        )
        current_from = (voltage[from_index] - voltage[to_index]) / series + voltage[from_index] * shunt / 2
        current_to = (voltage[to_index] - voltage[from_index]) / series + voltage[to_index] * shunt / 2
        line_loading[line_index] = (
            max(abs(current_from), abs(current_to)) * base_current / (line.max_i_ka * line.df * line.parallel) * 100
        )
    trafo_loading = {}
    for trafo_index, trafo in net.trafo.iterrows():
        if not trafo.in_service:
            trafo_loading[trafo_index] = 0.0
            continue
        high = index[int(trafo.hv_bus)]
        low = index[int(trafo.lv_bus)]
        rated = trafo.sn_mva * trafo.parallel
        short_circuit = trafo.vk_percent / 100 * SBASE / rated
        resistance = trafo.vkr_percent / 100 * SBASE / rated
        reactance = np.sqrt(short_circuit**2 - resistance**2)
        series_admittance = 1 / (resistance + 1j * reactance)
        ratio = 1 + (trafo.tap_pos - trafo.tap_neutral) * trafo.tap_step_percent / 100
        magnetising = trafo.i0_percent / 100 * rated / SBASE
        conductance = trafo.pfe_kw / 1000 / SBASE
        magnetising_admittance = conductance - 1j * np.sqrt(max(magnetising**2 - conductance**2, 0))
        current_low = series_admittance * (voltage[low] - voltage[high] / ratio) + magnetising_admittance / 2 * voltage[low]
        current_high = (voltage[high] / ratio - voltage[low]) * series_admittance / ratio + magnetising_admittance / 2 * voltage[high] / ratio**2
        trafo_loading[trafo_index] = max(abs(current_high), abs(current_low)) * SBASE / rated * 100
    return line_loading, trafo_loading
