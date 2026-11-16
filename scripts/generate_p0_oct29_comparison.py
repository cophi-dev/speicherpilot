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
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.font_manager import FontProperties
from matplotlib.text import Text
from matplotlib.ticker import FuncFormatter, MaxNLocator
from matplotlib.transforms import Bbox
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


_VAR_INST: dict[int, Path | None] = {}


def _variable_instance(weight: int) -> Path | None:
    """Static instance of the system Space Grotesk variable font (full cmap, incl. →)."""
    if weight in _VAR_INST:
        return _VAR_INST[weight]
    candidates = [
        Path("/usr/share/fonts/truetype/sand-box/google/Space Grotesk/SpaceGrotesk-VariableFont_wght.ttf"),
        Path("/usr/share/fonts/truetype/google/Space Grotesk/SpaceGrotesk-VariableFont_wght.ttf"),
    ]
    src = next((c for c in candidates if c.exists()), None)
    if src is None:
        _VAR_INST[weight] = None
        return None
    try:
        from fontTools.ttLib import TTFont
        from fontTools.varLib.instancer import instantiateVariableFont
    except ImportError:
        _VAR_INST[weight] = None
        return None
    inst = instantiateVariableFont(TTFont(str(src)), {"wght": weight})
    out = Path(f"/tmp/sp_grotesk_wght{weight}.ttf")
    inst.save(str(out))
    font_manager.fontManager.addfont(str(out))
    _VAR_INST[weight] = out
    return out


def _arrow() -> str:
    return "→" if _variable_instance(400) is not None else "–"


def _fp(size: float, *, medium: bool = False, mono: bool = False) -> FontProperties:
    if mono:
        path = ROOT / "public/fonts/JetBrainsMono-Regular.ttf"
        if path.exists():
            return FontProperties(fname=str(path), size=size)
        return FontProperties(family="monospace", size=size)
    inst = _variable_instance(500 if medium else 400)
    if inst is not None:
        return FontProperties(fname=str(inst), size=size)
    path = ROOT / (
        "public/fonts/SpaceGrotesk-Medium.ttf" if medium else "public/fonts/SpaceGrotesk-Regular.ttf"
    )
    if path.exists():
        return FontProperties(fname=str(path), size=size)
    return FontProperties(family="sans-serif", size=size)


def _setup_fonts() -> None:
    _variable_instance(400)
    _variable_instance(500)
    for path in (
        ROOT / "public/fonts/SpaceGrotesk-Regular.ttf",
        ROOT / "public/fonts/SpaceGrotesk-Medium.ttf",
        ROOT / "public/fonts/JetBrainsMono-Regular.ttf",
    ):
        if path.exists():
            font_manager.fontManager.addfont(str(path))


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


def _style_axes(ax, *, tick_fp: FontProperties) -> None:
    ax.set_facecolor(SP_FLAECHE)
    for spine in ax.spines.values():
        spine.set_color(SP_LINIE)
    ax.tick_params(colors=SP_INK, labelsize=tick_fp.get_size())
    ax.yaxis.set_major_formatter(FuncFormatter(_gw_de))
    ax.yaxis.set_major_locator(MaxNLocator(nbins=6, steps=[1, 2, 5, 10], prune="both"))
    ax.grid(True, color=SP_LINIE, linewidth=0.6, alpha=0.9)
    for lbl in ax.get_xticklabels() + ax.get_yticklabels():
        lbl.set_fontproperties(tick_fp)


def _hide_out_of_range_yticks(ax) -> None:
    lo, hi = ax.get_ylim()
    for label, val in zip(ax.get_yticklabels(), ax.get_yticks()):
        if val < lo - 1e-6 or val > hi + 1e-6:
            label.set_visible(False)


def _idx_at(times: list[datetime], hour: float) -> int:
    midnight = times[0].replace(hour=0, minute=0, second=0, microsecond=0)
    target = midnight + timedelta(hours=hour)
    return int(np.argmin([abs((t - target).total_seconds()) for t in times]))


def _direct_label(ax, times: list[datetime], ys: np.ndarray, text: str, color: str, *, fp: FontProperties) -> None:
    ax.annotate(
        text,
        xy=(times[-1], float(ys[-1])),
        xytext=(8, 0),
        textcoords="offset points",
        color=color,
        va="center",
        ha="left",
        fontproperties=fp,
        annotation_clip=False,
        clip_on=False,
    )


def _iter_visible_texts(fig):
    for artist in fig.findobj(Text):
        if not artist.get_visible():
            continue
        raw = artist.get_text()
        if raw is None or str(raw).strip() == "":
            continue
        yield artist


def _check_texts(fig) -> list[str]:
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    fig_bbox = fig.bbox
    items: list[tuple[str, Bbox]] = []
    for artist in _iter_visible_texts(fig):
        label = str(artist.get_text()).replace("\n", " | ")
        items.append((label, artist.get_window_extent(renderer=renderer)))

    lines: list[str] = []
    clipped: list[str] = []
    eps = 0.5
    for text, bbox in items:
        bits = []
        if bbox.x0 < fig_bbox.x0 - eps:
            bits.append(f"links {fig_bbox.x0 - bbox.x0:.1f}px")
        if bbox.y0 < fig_bbox.y0 - eps:
            bits.append(f"unten {fig_bbox.y0 - bbox.y0:.1f}px")
        if bbox.x1 > fig_bbox.x1 + eps:
            bits.append(f"rechts {bbox.x1 - fig_bbox.x1:.1f}px")
        if bbox.y1 > fig_bbox.y1 + eps:
            bits.append(f"oben {bbox.y1 - fig_bbox.y1:.1f}px")
        if bits:
            clipped.append(f"  CLIP „{text}“ ({', '.join(bits)})")

    overlaps: list[str] = []
    for i, (t1, b1) in enumerate(items):
        for t2, b2 in items[i + 1 :]:
            inter = Bbox.intersection(b1, b2)
            if inter is None:
                continue
            if inter.width > 1.0 and inter.height > 1.0:
                overlaps.append(
                    f"  OVERLAP „{t1}“ × „{t2}“ ({inter.width:.1f}×{inter.height:.1f}px)"
                )

    n = len(items)
    if not clipped:
        lines.append(f"  {n} Text-Artists vollständig in der Figure-Bbox: ja")
    else:
        lines.append(f"  {n} Text-Artists vollständig in der Figure-Bbox: NEIN")
        lines.extend(clipped)
    if not overlaps:
        lines.append("  Text-Text-Überlappungen: keine")
    else:
        lines.append("  Text-Text-Überlappungen:")
        lines.extend(overlaps)
    return lines


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
    _setup_fonts()
    day_start = datetime.fromisoformat(f"{DAY}T00:00:00+01:00").astimezone(BERLIN)
    day_end = day_start + timedelta(days=1)
    g = 1e-3

    if portrait:
        fig_w, fig_h, dpi = 7.2, 9.0, 150  # 1080×1350
        fs_title, fs_sub, fs_label, fs_footer, fs_tick = 17, 14, 14, 12, 11
        # right band reserved for end labels; top/bottom for title + Quellenzeile
        layout_rect = (0.0, 0.12, 0.76, 0.715)
    else:
        fig_w, fig_h, dpi = 12.0, 7.0, 120
        fs_title, fs_sub, fs_label, fs_footer, fs_tick = 15, 12, 11, 11, 11
        layout_rect = (0.0, 0.12, 0.84, 0.74)

    fp_title = _fp(fs_title, medium=True)
    fp_sub = _fp(fs_sub)
    fp_label = _fp(fs_label)
    fp_label_med = _fp(fs_label, medium=True)
    fp_footer = _fp(fs_footer, mono=True)
    fp_tick = _fp(fs_tick)

    fig, (ax1, ax2) = plt.subplots(
        2,
        1,
        figsize=(fig_w, fig_h),
        dpi=dpi,
        sharex=True,
        gridspec_kw={"height_ratios": [2.1, 1]},
        facecolor=SP_BG,
        layout="constrained",
    )
    fig.get_layout_engine().set(h_pad=0.08, w_pad=0.05, hspace=0.10, wspace=0.02, rect=layout_rect)

    r_gw = r * g
    rp_old_gw = rp_old * g
    rp_new_gw = rp_new * g
    c_old_gw = c_old * g
    c_new_gw = c_new * g

    peak_rp_gw = metrics["peakAfterNewMw"] / 1000.0
    ax1.axhline(peak_rp_gw, color=SP_INK, ls=(0, (4, 3)), lw=1.1, alpha=0.75)
    # Upper-left, above the 55,6 GW line, so the morning bump does not run through the words.
    ax1.text(
        day_start + timedelta(hours=0.35),
        peak_rp_gw + 6.0,
        "Spitze alt = neu",
        color=SP_INK,
        fontproperties=fp_label,
        ha="left",
        va="bottom",
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
        color=SP_INK,
        fontproperties=fp_label,
        ha="right",
        annotation_clip=False,
        clip_on=False,
    )

    i_old = int(np.argmax(c_old))
    i_new = int(np.argmax(c_new))

    # „alt“ sits on the distinctive 13–15h ramp, not at the shared 24:00 end.
    ax1.annotate(
        "alt",
        xy=(times[i_old], rp_old_gw[i_old]),
        xytext=(8, -10),
        textcoords="offset points",
        color=SP_WARM,
        fontproperties=fp_label_med,
        ha="left",
        va="top",
        annotation_clip=False,
        clip_on=False,
    )
    _direct_label(ax1, times, rp_new_gw, "neu (flach laden)", SP_MINT, fp=fp_label_med)

    # „beobachtet“ at 19:00, above the gray curve, to the right of the 64,4 GW marker (18:15).
    i_beob = _idx_at(times, 19.0)
    ax1.annotate(
        "beobachtet",
        xy=(times[i_beob], r_gw[i_beob]),
        xytext=(4, 10),
        textcoords="offset points",
        color=SP_MUTED,
        fontproperties=fp_label_med,
        ha="left",
        va="bottom",
        annotation_clip=False,
        clip_on=False,
    )

    _style_axes(ax1, tick_fp=fp_tick)
    ax1.set_ylabel("GW", color=SP_INK, fontproperties=fp_label)
    tick_times = [day_start + timedelta(hours=h) for h in (0, 6, 12, 18, 24)]
    ax1.set_xlim(day_start, day_end)
    ax1.set_xticks(tick_times)
    ax1.set_xticklabels([])
    y1_min = min(float(np.min(r_gw)), float(np.min(rp_old_gw)), float(np.min(rp_new_gw)))
    y1_max = max(float(np.max(r_gw)), float(np.max(rp_old_gw)), float(np.max(rp_new_gw)))
    ax1.set_ylim(max(0.0, y1_min - 2.0), y1_max + 7.0)

    ax2.plot(times, c_old_gw, color=SP_WARM, lw=1.4, ls=(0, (5, 3)))
    ax2.plot(times, c_new_gw, color=SP_MINT, lw=2.0)
    _style_axes(ax2, tick_fp=fp_tick)
    ax2.set_ylabel("Laden in GW", color=SP_INK, fontproperties=fp_label)
    ax2.set_xlabel("Uhrzeit", color=SP_INK, fontproperties=fp_label)
    ax2.set_xticks(tick_times)
    ax2.set_xticklabels(["0", "6", "12", "18", "24"], fontproperties=fp_tick)
    ax2.set_xlim(day_start, day_end)

    ax2.annotate(
        _label_gw(metrics["maxChargeOldMw"]),
        xy=(times[i_old], c_old_gw[i_old]),
        xytext=(0, 10),
        textcoords="offset points",
        color=SP_WARM,
        fontproperties=fp_label,
        ha="center",
        annotation_clip=False,
        clip_on=False,
    )
    # Keep the 7,1 GW value inside the axes; the end label sits in the right margin.
    ax2.annotate(
        _label_gw(metrics["maxChargeNewMw"]),
        xy=(times[i_new], c_new_gw[i_new]),
        xytext=(-4, 10),
        textcoords="offset points",
        color=SP_MINT,
        fontproperties=fp_label,
        ha="right",
        annotation_clip=False,
        clip_on=False,
    )
    # „alt“ on the rising edge of the 17,7 GW spike, mid-height, left of the peak.
    peak_c = float(c_old_gw[i_old])
    ax2.annotate(
        "alt",
        xy=(times[i_old], peak_c * 0.55),
        xytext=(-10, 0),
        textcoords="offset points",
        color=SP_WARM,
        fontproperties=fp_label_med,
        ha="right",
        va="center",
        annotation_clip=False,
        clip_on=False,
    )
    _direct_label(ax2, times, c_new_gw, "neu", SP_MINT, fp=fp_label_med)

    y2_max = max(float(np.max(c_old_gw)), float(np.max(c_new_gw)))
    ax2.set_ylim(0.0, max(21.0, y2_max * 1.22))

    _hide_out_of_range_yticks(ax1)
    _hide_out_of_range_yticks(ax2)

    pflicht = "Modell · national, kein (n−1), nicht Abregelung"
    if portrait:
        fig.text(
            0.5,
            0.978,
            "29.10.2026 · ×5\ngleiche Spitze 55,6\u00a0GW – Laden max 17,7 " + _arrow() + " 7,1\u00a0GW",
            ha="center",
            va="top",
            fontproperties=fp_title,
            color=SP_INK,
            linespacing=1.35,
        )
        fig.text(
            0.5,
            0.872,
            "Modell, Tageshorizont",
            ha="center",
            va="top",
            fontproperties=fp_sub,
            color=SP_MUTED,
        )
        quelle = (
            "Quellen: Energy-Charts/Fraunhofer ISE · Battery Charts RWTH ISEA\n"
            "Flottenstand 31.10.2026"
        )
        fig.text(0.5, 0.016, quelle, ha="center", va="bottom", fontproperties=fp_footer, color=SP_INK, linespacing=1.3)
        fig.text(0.5, 0.090, pflicht, ha="center", va="bottom", fontproperties=fp_footer, color=SP_INK)
    else:
        fig.text(
            0.5,
            0.978,
            "29.10.2026 · ×5: gleiche Spitze 55,6\u00a0GW – Laden max 17,7 " + _arrow() + " 7,1\u00a0GW",
            ha="center",
            va="top",
            fontproperties=fp_title,
            color=SP_INK,
        )
        fig.text(
            0.5,
            0.932,
            "Modell, Tageshorizont",
            ha="center",
            va="top",
            fontproperties=fp_sub,
            color=SP_MUTED,
        )
        quelle = (
            "Quellen: Energy-Charts/Fraunhofer ISE · Battery Charts RWTH ISEA · "
            "Flottenstand 31.10.2026"
        )
        fig.text(0.5, 0.016, quelle, ha="center", va="bottom", fontproperties=fp_footer, color=SP_INK)
        fig.text(0.5, 0.052, pflicht, ha="center", va="bottom", fontproperties=fp_footer, color=SP_INK)

    report = _check_texts(fig)
    kind = "portrait" if portrait else "landscape"
    print(f"Prüfung {kind} ({out_path.name}):", file=sys.stderr)
    for line in report:
        print(line, file=sys.stderr)

    fig.savefig(out_path, facecolor=SP_BG, edgecolor="none")
    plt.close(fig)


if __name__ == "__main__":
    raise SystemExit(main())
