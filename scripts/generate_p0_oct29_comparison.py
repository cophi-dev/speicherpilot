#!/usr/bin/env python3
"""Vorher/Nachher 29.10.2026 ×5 Spitze — Tageshorizont, SoC 50/50, echter alter/n eu MIP-LP."""
from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.ticker import FuncFormatter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]

# SpeicherPilot design tokens (app/globals.css, light)
SP_BG = "#f6f6f3"
SP_FLAECHE = "#ffffff"
SP_INK = "#101214"
SP_MUTED = "#5c646c"
SP_LINIE = "#dadad3"
SP_MINT = "#147b66"
SP_CORAL = "#9e2b1a"
SP_WARM = "#b4532a"
SP_GRID = "#4a63b8"
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
    peak_idx = int(np.argmax(r))
    peak_time = ts[peak_idx]
    peak_measured_mw = float(r[peak_idx])
    peak_new_at_measured_mw = float(rp_new[peak_idx])

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
        "peakTimeNew": ts[int(np.argmax(rp_new))],
        "peakTimeMeasured": peak_time,
        "peakNewAtMeasuredMw": peak_new_at_measured_mw,
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

    landscape = OUT / "oct29-x5-spitze-vorher-nachher.png"
    portrait = OUT / "oct29-x5-spitze-vorher-nachher-portrait.png"
    _plot(times, r, rp_old, rp_new, c_old, c_new, metrics, landscape, portrait=False)
    _plot(times, r, rp_old, rp_new, c_old, c_new, metrics, portrait, portrait=True)
    print("wrote", landscape, "and", portrait, file=sys.stderr)
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    return 0


def _std_charge_before_17(c: np.ndarray, ts: list[str]) -> float:
    xs = [float(c[i]) for i in range(len(c)) if int(ts[i][11:13]) < 17]
    if len(xs) < 2:
        return 0.0
    m = sum(xs) / len(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs))


def _setup_fonts() -> tuple[str, str]:
    for path in (
        ROOT / "public/fonts/SpaceGrotesk-Regular.ttf",
        ROOT / "public/fonts/SpaceGrotesk-Medium.ttf",
        ROOT / "public/fonts/JetBrainsMono-Regular.ttf",
    ):
        if path.exists():
            font_manager.fontManager.addfont(str(path))
    body = "Space Grotesk" if (ROOT / "public/fonts/SpaceGrotesk-Regular.ttf").exists() else "sans-serif"
    mono = "JetBrains Mono" if (ROOT / "public/fonts/JetBrainsMono-Regular.ttf").exists() else "monospace"
    return body, mono


def _gw_de(x: float, _pos: int) -> str:
    if abs(x - round(x)) < 0.05:
        s = str(int(round(x)))
    else:
        s = f"{x:.1f}".replace(".", ",")
    return f"{s}\u00a0GW"


def _label_gw(mw: float) -> str:
    gw = mw / 1000.0
    if abs(gw - round(gw, 1)) < 0.05:
        s = f"{gw:.1f}".replace(".", ",")
    else:
        s = f"{gw:.2f}".replace(".", ",")
    return f"{s}\u00a0GW"


def _style_axes(ax, *, body_font: str) -> None:
    ax.set_facecolor(SP_FLAECHE)
    for spine in ax.spines.values():
        spine.set_color(SP_LINIE)
    ax.tick_params(colors=SP_INK, labelsize=11)
    ax.yaxis.set_major_formatter(FuncFormatter(_gw_de))
    ax.grid(True, color=SP_LINIE, linewidth=0.6, alpha=0.9)
    for lbl in ax.get_xticklabels() + ax.get_yticklabels():
        lbl.set_fontfamily(body_font)


def _direct_label(ax, times: list[datetime], ys: np.ndarray, text: str, color: str, *, fs: float) -> None:
    x = times[-1]
    y = float(ys[-1])
    ax.annotate(
        text,
        xy=(x, y),
        xytext=(6, 0),
        textcoords="offset points",
        fontsize=fs,
        color=color,
        va="center",
        fontweight="medium",
    )


def _plot(
    times: list[datetime],
    r: np.ndarray,
    rp_old: np.ndarray,
    rp_new: np.ndarray,
    c_old: np.ndarray,
    c_new: np.ndarray,
    metrics: dict,
    out_path: Path,
    *,
    portrait: bool,
) -> None:
    body_font, mono_font = _setup_fonts()
    day_start = datetime.fromisoformat(f"{DAY}T00:00:00+01:00").astimezone(BERLIN)
    day_end = day_start + timedelta(days=1)
    g = 1e-3

    if portrait:
        fig_w, fig_h, dpi = 7.2, 9.0, 150
        fs_title, fs_sub, fs_label, fs_footer = 17, 14, 14, 12
    else:
        fig_w, fig_h, dpi = 12.0, 7.0, 120
        fs_title, fs_sub, fs_label, fs_footer = 15, 12, 11, 11

    fig, (ax1, ax2) = plt.subplots(
        2,
        1,
        figsize=(fig_w, fig_h),
        dpi=dpi,
        sharex=True,
        gridspec_kw={"height_ratios": [2.1, 1], "hspace": 0.08},
        facecolor=SP_BG,
    )

    r_gw = r * g
    rp_old_gw = rp_old * g
    rp_new_gw = rp_new * g
    c_old_gw = c_old * g
    c_new_gw = c_new * g

    peak_rp_gw = metrics["peakAfterNewMw"] / 1000.0
    ax1.axhline(peak_rp_gw, color=SP_INK, ls=(0, (4, 3)), lw=1.1, alpha=0.75)
    ax1.text(
        day_start + timedelta(hours=0.4),
        peak_rp_gw + 0.35,
        "Spitze alt = neu",
        fontsize=fs_label,
        color=SP_INK,
        fontfamily=body_font,
    )

    ax1.plot(times, r_gw, color=SP_MUTED, lw=1.6, solid_capstyle="round")
    ax1.plot(times, rp_old_gw, color=SP_WARM, lw=1.4, ls=(0, (5, 3)), alpha=0.95)
    ax1.plot(times, rp_new_gw, color=SP_MINT, lw=2.0, solid_capstyle="round")

    ax1.fill_between(
        times,
        r_gw,
        rp_new_gw,
        where=(c_new > 1e-3),
        color=SP_MINT,
        alpha=0.48,
        interpolate=True,
    )
    ax1.fill_between(
        times,
        r_gw,
        rp_new_gw,
        where=(c_new <= 1e-3) & (rp_new < r - 1e-3),
        color=SP_GRID,
        alpha=0.45,
        interpolate=True,
    )

    pt_meas = datetime.fromisoformat(metrics["peakTimeMeasured"])
    idx_meas = int(np.argmax(r))
    ax1.plot(pt_meas, r_gw[idx_meas], "o", color=SP_INK, ms=7, zorder=5)
    ax1.annotate(
        _label_gw(metrics["peakBeforeMw"]),
        xy=(pt_meas, r_gw[idx_meas]),
        xytext=(-8, 14),
        textcoords="offset points",
        fontsize=fs_label,
        color=SP_INK,
        fontfamily=body_font,
        ha="right",
    )

    _direct_label(ax1, times, rp_old_gw, "Modell ×5 alt", SP_WARM, fs=fs_label)
    _direct_label(ax1, times, rp_new_gw, "Modell ×5 neu (flach laden)", SP_MINT, fs=fs_label)
    ax1.text(
        times[12],
        r_gw[12],
        "beobachtet",
        fontsize=fs_label,
        color=SP_MUTED,
        fontfamily=body_font,
        fontweight="medium",
    )

    _style_axes(ax1, body_font=body_font)
    ax1.set_ylabel("GW", fontsize=fs_label, color=SP_INK, fontfamily=body_font)
    tick_times = [day_start + timedelta(hours=h) for h in (0, 6, 12, 18, 24)]
    ax1.set_xlim(day_start, day_end)
    ax1.set_xticks(tick_times)
    ax1.set_xticklabels([])

    ax2.plot(times, c_old_gw, color=SP_WARM, lw=1.4, ls=(0, (5, 3)))
    ax2.plot(times, c_new_gw, color=SP_MINT, lw=2.0)
    _style_axes(ax2, body_font=body_font)
    ax2.set_ylabel("Laden in GW", fontsize=fs_label, color=SP_INK, fontfamily=body_font)
    ax2.set_xlabel("Uhrzeit", fontsize=fs_label, color=SP_INK, fontfamily=body_font)
    ax2.set_xticks(tick_times)
    ax2.set_xticklabels(["0", "6", "12", "18", "24"])
    ax2.set_xlim(day_start, day_end)
    for lbl in ax2.get_xticklabels():
        lbl.set_fontfamily(body_font)

    i_old = int(np.argmax(c_old))
    i_new = int(np.argmax(c_new))
    ax2.annotate(
        _label_gw(metrics["maxChargeOldMw"]),
        xy=(times[i_old], c_old_gw[i_old]),
        xytext=(0, 10),
        textcoords="offset points",
        fontsize=fs_label,
        color=SP_WARM,
        fontfamily=body_font,
        ha="center",
    )
    ax2.annotate(
        _label_gw(metrics["maxChargeNewMw"]),
        xy=(times[i_new], c_new_gw[i_new]),
        xytext=(0, 10),
        textcoords="offset points",
        fontsize=fs_label,
        color=SP_MINT,
        fontfamily=body_font,
        ha="center",
    )
    _direct_label(ax2, times, c_old_gw, "Modell ×5 alt", SP_WARM, fs=fs_label)
    _direct_label(ax2, times, c_new_gw, "Modell ×5 neu", SP_MINT, fs=fs_label)

    title = "29.10.2026 · ×5: gleiche Spitze 55,6\u00a0GW – Laden max 17,7 → 7,1\u00a0GW"
    fig.suptitle(
        title,
        fontsize=fs_title,
        fontweight="medium",
        color=SP_INK,
        fontfamily=body_font,
        y=0.98 if portrait else 0.96,
        ha="center",
    )
    fig.text(
        0.5,
        0.935 if portrait else 0.915,
        "Modell, Tageshorizont",
        ha="center",
        fontsize=fs_sub,
        color=SP_MUTED,
        fontfamily=body_font,
    )

    pflicht = "Modell · national, kein (n−1), nicht Abregelung"
    quelle = (
        "Quellen: Energy-Charts/Fraunhofer ISE · Battery Charts RWTH ISEA · "
        "Flottenstand 31.10.2026"
    )
    fig.text(0.5, 0.045, pflicht, ha="center", fontsize=fs_footer, color=SP_INK, fontfamily=mono_font)
    fig.text(0.5, 0.018, quelle, ha="center", fontsize=fs_footer, color=SP_INK, fontfamily=mono_font)

    fig.subplots_adjust(left=0.1, right=0.94, top=0.88 if portrait else 0.86, bottom=0.14)
    fig.savefig(out_path, facecolor=SP_BG, edgecolor="none")
    plt.close(fig)


if __name__ == "__main__":
    raise SystemExit(main())