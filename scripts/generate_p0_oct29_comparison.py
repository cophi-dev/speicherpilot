#!/usr/bin/env python3
"""Vorher/Nachher 29.10.2026 ×5 Spitze — Tageshorizont, SoC 50/50, echter alter/n eu MIP-LP."""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "artifacts/october-storage-counterfactual-20261107"))
from mip_month import (  # noqa: E402
    CHARGE_SMOOTH_MWH_PER_MW_RAMP,
    DT_H,
    ETA,
    PEAK_LEX_TOLERANCE_MW,
    MonthStorageMip,
)

BASE_POWER_MW = 4_644.09022
BASE_ENERGY_MWH = 8_152.4588

OUT = ROOT / "review-artifacts/p0-flach-laden"
DAY = "2026-10-29"
FACTOR = 5
BERLIN = ZoneInfo("Europe/Berlin")


def main() -> int:
    run = json.loads(
        (ROOT / "data/national-fleet/2026-10/runs/x5_min_peak_perfect_foresight.json").read_text()
    )
    idx = [i for i, t in enumerate(run["timestamp_berlin"]) if t.startswith(DAY)]
    ts = [run["timestamp_berlin"][i] for i in idx]
    r = np.array([run["r_mw"][i] for i in idx], dtype=float)
    p_mw = (FACTOR - 1) * BASE_POWER_MW
    e_nom = (FACTOR - 1) * BASE_ENERGY_MWH

    m_old = MonthStorageMip(len(r), p_mw, e_nom)
    c_old, d_old, e_old, _ = m_old.solve_min_peak(r)
    m_new = MonthStorageMip(len(r), p_mw, e_nom)
    c_new, d_new, e_new, _ = m_new.solve_min_peak_flat(r)

    rp_old = r + c_old - d_old
    rp_new = r + c_new - d_new

    def energy_balance(c: np.ndarray, d: np.ndarray) -> dict:
        charged_battery = float(np.sum(ETA * c * DT_H))
        discharged_battery = float(np.sum(d * DT_H / ETA))
        soc_delta = float(e_nom * 0.0)  # 50% → 50%
        residue = charged_battery - discharged_battery - soc_delta
        grid_charge = float(np.sum(c * DT_H))
        grid_discharge = float(np.sum(d * DT_H))
        return {
            "sumChargeGridMwh": grid_charge,
            "sumDischargeGridMwh": grid_discharge,
            "sumChargeBatteryMwh": charged_battery,
            "sumDischargeBatteryMwh": discharged_battery,
            "socDeltaMwh": soc_delta,
            "balanceResidueMwh": residue,
            "ok": abs(residue) < 0.05,
        }

    bal_old = energy_balance(c_old, d_old)
    bal_new = energy_balance(c_new, d_new)

    times = [datetime.fromisoformat(t) for t in ts]
    peak_idx = int(np.argmax(rp_new))
    peak_time = ts[peak_idx]

    metrics = {
        "day": DAY,
        "factor": FACTOR,
        "horizon": "day",
        "socStartEndFraction": 0.5,
        "modelFleet": {
            "basePowerMw": BASE_POWER_MW,
            "baseEnergyMwh": BASE_ENERGY_MWH,
            "asOfBerlin": "2026-10-31",
            "source": "battery-charts Großspeicher",
            "additionalPowerMw": p_mw,
            "additionalEnergyMwh": e_nom,
        },
        "plausibilityNoteDe": (
            "55,608 GW = Tageshorizont ×5, SoC 50/50, Flotte 4,64 GW / 8,15 GWh (31.10.). "
            "Konzept-Mock ~55,0 GW kann abweichen (4,70/8,27-Rundung, anderer Plot-Kontext). "
            "Oktober-Sharded-Monat 54,99 GW am 29.10. = Monatslauf mit durchgehendem SoC, nicht Tageshorizont."
        ),
        "peakBeforeMw": float(np.max(r)),
        "peakAfterOldMw": float(np.max(rp_old)),
        "peakAfterNewMw": float(np.max(rp_new)),
        "peakDeltaMw": float(np.max(rp_new) - np.max(rp_old)),
        "peakTimeNew": peak_time,
        "maxChargeOldMw": float(np.max(c_old)),
        "maxChargeNewMw": float(np.max(c_new)),
        "sumChargeOldMwh": bal_old["sumChargeGridMwh"],
        "sumChargeNewMwh": bal_new["sumChargeGridMwh"],
        "stdChargeOutsideEveningOldMw": _std_charge_before_17(c_old, ts),
        "stdChargeOutsideEveningNewMw": _std_charge_before_17(c_new, ts),
        "energyBalanceOld": bal_old,
        "energyBalanceNew": bal_new,
        "lexToleranceMw": PEAK_LEX_TOLERANCE_MW,
        "smoothMwhPerMwRamp": CHARGE_SMOOTH_MWH_PER_MW_RAMP,
        "oldEngine": "solve_min_peak (MIP Stufe 1, kein lex flach)",
        "newEngine": "solve_min_peak_flat (MIP Stufe 1 + LP Stufe 2)",
        "greedyArtifactNote": (
            "Greedy unter Kappenwert klemmt R′ im Tagesverlauf auf die Kappe — kein Abbild des alten MIP; "
            "deshalb entfällt er als Vorher-Referenz."
        ),
    }

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "oct29-x5-metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    _plot(times, r, rp_old, rp_new, c_old, c_new, metrics)
    print("wrote", OUT / "oct29-x5-spitze-vorher-nachher.png", file=sys.stderr)
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    return 0


def _std_charge_before_17(c: np.ndarray, ts: list[str]) -> float:
    xs = [float(c[i]) for i in range(len(c)) if int(ts[i][11:13]) < 17]
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))


def _plot(
    times: list[datetime],
    r: np.ndarray,
    rp_old: np.ndarray,
    rp_new: np.ndarray,
    c_old: np.ndarray,
    c_new: np.ndarray,
    metrics: dict,
) -> None:
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7), dpi=120, gridspec_kw={"height_ratios": [2, 1]})
    g = 1e-3

    ax1.plot(times, r * g, color="#6b7280", lw=1.5, label="gemessen (R)")
    ax1.plot(times, rp_old * g, color="#b45309", lw=1.2, alpha=0.9, label="mit ×5 alt")
    ax1.fill_between(
        times,
        r * g,
        rp_new * g,
        where=(c_new > 1e-3),
        color="#15803d",
        alpha=0.25,
        interpolate=True,
        label="Laden (neu)",
    )
    ax1.fill_between(
        times,
        r * g,
        rp_new * g,
        where=(c_new <= 1e-3) & (rp_new < r - 1e-3),
        color="#0369a1",
        alpha=0.2,
        interpolate=True,
        label="Entladen (neu)",
    )
    ax1.plot(times, rp_new * g, color="#14532d", lw=1.6, label="mit ×5 neu: flach laden")

    pt = datetime.fromisoformat(metrics["peakTimeNew"])
    ax1.axvline(pt, color="#14532d", ls=":", lw=0.8, alpha=0.6)
    ax1.annotate(
        f"Spitze {metrics['peakAfterNewMw'] / 1000:.3f} GW",
        xy=(pt, metrics["peakAfterNewMw"] * g),
        xytext=(12, 12),
        textcoords="offset points",
        fontsize=8,
        bbox=dict(boxstyle="round", facecolor="white", alpha=0.85),
    )

    ax1.set_ylabel("GW")
    ax1.set_title(f"29.10.2026 · ×5 · bundesweite Restlast-Spitze (Modell, Tageshorizont)")
    ax1.legend(loc="upper left", fontsize=8, ncol=2)
    ax1.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M", tz=BERLIN))
    ax1.set_xlim(times[0], times[-1])

    ax2.plot(times, c_old, color="#b45309", lw=1.0, label="Ladeleistung alt")
    ax2.plot(times, c_new, color="#14532d", lw=1.2, label="Ladeleistung neu")
    ax2.set_ylabel("MW (Laden)")
    ax2.set_xlabel("Uhrzeit (Europe/Berlin)")
    ax2.legend(loc="upper right", fontsize=8)
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M", tz=BERLIN))

    note = (
        f"Σ Laden alt/neu: {metrics['sumChargeOldMwh']:.0f} / {metrics['sumChargeNewMwh']:.0f} MWh  ·  "
        f"Bilanz alt OK: {metrics['energyBalanceOld']['ok']}  neu OK: {metrics['energyBalanceNew']['ok']}"
    )
    fig.text(0.5, 0.01, note, ha="center", fontsize=8, color="#374151")
    fig.autofmt_xdate()
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(OUT / "oct29-x5-spitze-vorher-nachher.png")
    plt.close(fig)


if __name__ == "__main__":
    raise SystemExit(main())