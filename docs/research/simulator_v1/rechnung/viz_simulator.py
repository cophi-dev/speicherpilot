#!/usr/bin/env python3
"""Entwurfsgraphen zur Simulator-Rechnung v1.

Jede Linie und Zahl kommt aus den CSV/JSON dieser Rechnung.
Stil: fachlich zuerst (Skill data-visual-engineering-check).
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.dates as mdates
import matplotlib.font_manager as fm
import numpy as np
from datetime import datetime
from zoneinfo import ZoneInfo

# --- lokale Imports für Kompromiss-Tagesfahrplan
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from solve_simulator import (
    load_intervals, daily_indices, slice_day, solve_mode, save_dispatch, DT_H,
)

ROOT = Path(__file__).resolve().parent
GRAPH = ROOT / "graphs"
GRAPH.mkdir(exist_ok=True)
BERLIN = ZoneInfo("Europe/Berlin")

# Schrift: statisches Source Sans Pro (Variable-Fonts fallen auf Gewicht 200 zurück)
SSP = Path("/usr/share/fonts/truetype/sand-box/custom/Source Sans Pro")
for fp in sorted(SSP.glob("*.ttf")):
    fm.fontManager.addfont(str(fp))
FAMILY = "Source Sans Pro"

mpl.rcParams.update({
    "font.family": FAMILY,
    "font.size": 10,
    "axes.unicode_minus": False,
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "savefig.facecolor": "white",
    "axes.edgecolor": "#1A1A1A",
    "axes.labelcolor": "#1A1A1A",
    "xtick.color": "#1A1A1A",
    "ytick.color": "#1A1A1A",
    "text.color": "#1A1A1A",
    "axes.linewidth": 0.7,
    "grid.color": "#E4E4E4",
    "grid.linewidth": 0.5,
    "legend.frameon": False,
    "pdf.fonttype": 42,
    "ps.fonttype": 42,
})

C_INK = "#1A1A1A"
C_MUTED = "#4A4A4A"
C_GRID = "#E4E4E4"
C_MARKT = "#B4532A"
C_NETZ = "#0F6E6B"
C_KOMP = "#3D4A9F"
C_FNAV = "#1A1A1A"
C_70 = "#1B7F4E"
C_HEBUNG = "#B42318"
C_SCHWACH = "#C2410C"
C_NEUTRAL = "#8A8A8A"
C_WIN = "#1B7F4E"
C_OBS = "#6B6B6B"
C_PRICE = "#5B3D8F"
C_HATCH = "#D0D0D0"
C_CHARGE = "#D97706"
C_DISCH = "#0F6E6B"


def de(n, digits=2):
    """Deutsche Zahl: 34,09."""
    if n is None or (isinstance(n, float) and not np.isfinite(n)):
        return "—"
    s = f"{n:,.{digits}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def de_int(n):
    return f"{int(round(n)):,}".replace(",", ".")


# ---------------------------------------------------------------------------
# Daten laden
# ---------------------------------------------------------------------------
def load_pareto():
    rows = list(csv.DictReader((ROOT / "pareto_punkte.csv").open(encoding="utf-8")))
    for r in rows:
        for k in ("factor",):
            r[k] = int(r[k])
        for k in (
            "lam_eur_per_mw", "revenue_eur", "revenue_mio_eur", "peak_mw", "peak_gw",
            "reduction_mw", "reduction_gw", "baseline_peak_gw", "charge_mwh",
            "discharge_mwh", "rte_grid", "runtime_s", "frac_rev", "frac_red",
        ):
            r[k] = float(r[k]) if r[k] not in ("", "None", None) else None
    return rows


def load_daily():
    rows = list(csv.DictReader((ROOT / "tagesklassen_oktober.csv").open(encoding="utf-8")))
    for r in rows:
        for k in (
            "n_intervals", "baseline_peak_mw", "market_peak_mw", "market_reduction_gw",
            "market_revenue_eur", "netz_peak_mw", "netz_reduction_gw", "netz_revenue_eur",
            "netz_raw_revenue_eur", "share_of_netz_reduction", "price_min", "price_max",
            "spread_eur_mwh", "max_day_revenue_eur",
        ):
            r[k] = float(r[k]) if r[k] not in ("", "None", None) else None
        r["market_raises_peak"] = r["market_raises_peak"] == "True"
    return rows


def load_disp(path: Path):
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    def col(k):
        return np.array([float(r[k]) for r in rows])
    ts = [datetime.fromisoformat(r["timestamp_berlin"]) for r in rows]
    return dict(
        ts=ts, c=col("c_mw"), d=col("d_mw"), e=col("soc_mwh"),
        R=col("residual_mw"), Rp=col("residual_prime_mw"), p=col("day_ahead_eur_mwh"),
        raw=rows,
    )


def unique_front(rows_fac, min_dred_mw=0.15, min_drev=15.0):
    """Extrempunkte + Raster, nach Senkung sortiert, Deduplizierung."""
    pts = [r for r in rows_fac if r["source"] in ("market_lex", "netz_lex", "lam_grid", "dichotomy", "eps50", "eps70", "eps90")]
    pts = sorted(pts, key=lambda r: (r["reduction_mw"], -r["revenue_eur"]))
    uniq = []
    for p in pts:
        if not uniq:
            uniq.append(p)
            continue
        if abs(p["reduction_mw"] - uniq[-1]["reduction_mw"]) < min_dred_mw and abs(
            p["revenue_eur"] - uniq[-1]["revenue_eur"]
        ) < min_drev:
            # behalte den mit Quelle Endpunkt/eps bevorzugt
            if p["source"] in ("market_lex", "netz_lex", "eps70", "eps50", "eps90") and uniq[-1]["source"] not in (
                "market_lex", "netz_lex", "eps70",
            ):
                uniq[-1] = p
            continue
        uniq.append(p)
    return uniq


# ---------------------------------------------------------------------------
# G1 Pareto
# ---------------------------------------------------------------------------
def fig_g1(rows, fnavb=None, width=1280, height=720, tag="1280"):
    fac2 = [r for r in rows if r["factor"] == 2]
    mkt = next(r for r in fac2 if r["source"] == "market_lex")
    net = next(r for r in fac2 if r["source"] == "netz_lex")
    fnav = next(r for r in fac2 if r["source"] == "fnav_lex")
    e70 = next(r for r in fac2 if r["source"] == "eps70")
    e50 = next(r for r in fac2 if r["source"] == "eps50")
    e90 = next(r for r in fac2 if r["source"] == "eps90")
    front = unique_front(fac2)
    cap62 = None
    if fnavb and "2_cap62" in fnavb:
        cap62 = fnavb["2_cap62"]

    fig, axes = plt.subplots(1, 2, figsize=(width / 110, height / 110), dpi=110)
    fig.subplots_adjust(left=0.07, right=0.98, top=0.78, bottom=0.22, wspace=0.22)

    def draw(ax, xlim, ylim, zoom=False):
        # 70/70-Feld: nur der Quadrant oben rechts
        x70 = 0.70 * mkt["revenue_mio_eur"]
        y70 = 0.70 * net["reduction_gw"]
        ax.fill_between([x70, xlim[1]], y70, ylim[1], color=C_70, alpha=0.12, zorder=0, lw=0)
        ax.axhline(y70, color=C_70, ls="--", lw=0.8, zorder=2)
        ax.axvline(x70, color=C_70, ls="--", lw=0.8, zorder=2)
        if not zoom:
            ax.text(
                (x70 + xlim[1]) / 2, (y70 + ylim[1]) / 2,
                "70/70-Feld\n(H3)",
                ha="center", va="center", color=C_70, fontsize=9, fontweight="600",
                alpha=0.9, zorder=3,
            )
        else:
            ax.text(
                34.05, y70 + 0.08,
                f"70 % der max. Senkung = {de(y70, 2)} GW",
                ha="right", va="bottom", color=C_70, fontsize=7.5, zorder=3,
            )

        xs = [p["revenue_mio_eur"] for p in front]
        ys = [p["reduction_gw"] for p in front]
        ax.plot(xs, ys, color=C_INK, lw=1.6, zorder=4, solid_capstyle="round")
        # Rasterpunkte (klein)
        grid = [p for p in fac2 if p["source"] == "lam_grid"]
        ax.scatter(
            [p["revenue_mio_eur"] for p in grid],
            [p["reduction_gw"] for p in grid],
            s=18, color="#7A7A7A", zorder=5, linewidths=0, label="λ-Raster (15 Punkte)",
        )
        # Endpunkte
        ax.scatter([mkt["revenue_mio_eur"]], [mkt["reduction_gw"]], s=70, color=C_MARKT, zorder=6, label="Markt (lex)")
        ax.scatter([net["revenue_mio_eur"]], [net["reduction_gw"]], s=70, color=C_NETZ, zorder=6, label="Netzdienlich (lex)")
        ax.scatter([e70["revenue_mio_eur"]], [e70["reduction_gw"]], s=55, color=C_KOMP, zorder=6, marker="D", label="ε-Schnitt 70 % Senkung")
        # fNAV
        ax.scatter(
            [fnav["revenue_mio_eur"]], [fnav["reduction_gw"]],
            s=80, facecolors="none", edgecolors=C_FNAV, linewidths=1.6, zorder=7,
            marker="o", label="fNAV Entnahmeverbot 16–21 Uhr",
        )
        if cap62:
            ax.scatter(
                [cap62["revenue_mio_eur"]], [cap62["reduction_gw"]],
                s=70, facecolors="none", edgecolors=C_KOMP, linewidths=1.6, zorder=7,
                marker="s", label="fNAV-Deckel 62 GW (Restlast nach Speicher)",
            )

        if zoom:
            # Beschriftungen direkt
            ax.annotate(
                f"Markt\n{de(mkt['revenue_mio_eur'], 2)} Mio. €\n{de(mkt['reduction_gw'], 2)} GW",
                xy=(mkt["revenue_mio_eur"], mkt["reduction_gw"]),
                xytext=(mkt["revenue_mio_eur"] + 0.025, mkt["reduction_gw"] + 0.15),
                fontsize=7.5, color=C_MARKT, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_MARKT, lw=0.6),
            )
            ax.annotate(
                f"Netzdienlich\n{de(net['revenue_mio_eur'], 2)} Mio. €\n{de(net['reduction_gw'], 2)} GW",
                xy=(net["revenue_mio_eur"], net["reduction_gw"]),
                xytext=(net["revenue_mio_eur"] - 0.12, net["reduction_gw"] - 0.45),
                fontsize=7.5, color=C_NETZ, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_NETZ, lw=0.6),
            )
            ax.annotate(
                f"70 %-Schnitt\n{de(e70['revenue_mio_eur'], 2)} Mio. €  ({de(100*e70['revenue_eur']/mkt['revenue_eur'], 1)} %)\n{de(e70['reduction_gw'], 2)} GW",
                xy=(e70["revenue_mio_eur"], e70["reduction_gw"]),
                xytext=(e70["revenue_mio_eur"] - 0.22, e70["reduction_gw"] + 0.25),
                fontsize=7.5, color=C_KOMP, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_KOMP, lw=0.6),
            )
            ax.annotate(
                "fNAV 16–21 Uhr\nlandet am Markt-Ende",
                xy=(fnav["revenue_mio_eur"], fnav["reduction_gw"]),
                xytext=(fnav["revenue_mio_eur"] - 0.02, fnav["reduction_gw"] + 0.55),
                fontsize=7.2, color=C_INK,
                arrowprops=dict(arrowstyle="-", color=C_INK, lw=0.6),
            )
            if cap62:
                ax.annotate(
                    f"Deckel 62 GW\n{de(cap62['revenue_mio_eur'], 2)} Mio. €, {de(cap62['reduction_gw'], 2)} GW",
                    xy=(cap62["revenue_mio_eur"], cap62["reduction_gw"]),
                    xytext=(cap62["revenue_mio_eur"] - 0.18, cap62["reduction_gw"] - 0.55),
                    fontsize=7.2, color=C_KOMP,
                    arrowprops=dict(arrowstyle="-", color=C_KOMP, lw=0.6),
                )
            # Kosten-Pfeil
            ax.annotate(
                "",
                xy=(net["revenue_mio_eur"], 3.75),
                xytext=(mkt["revenue_mio_eur"], 3.75),
                arrowprops=dict(arrowstyle="<->", color=C_MUTED, lw=0.8),
            )
            ax.text(
                (mkt["revenue_mio_eur"] + net["revenue_mio_eur"]) / 2,
                3.82,
                f"volle Senkung kostet {de((mkt['revenue_eur']-net['revenue_eur'])/1e6, 2)} Mio. €  (0,89 % des Markt-Erlöses)",
                ha="center", va="bottom", fontsize=7, color=C_MUTED,
            )

        ax.set_xlim(*xlim)
        ax.set_ylim(*ylim)
        ax.grid(True, zorder=0)
        ax.set_xlabel("Day-Ahead-Erlös der Zusatzflotte, Mio. €  (Modellschätzung)", fontsize=8.5)
        ax.set_ylabel("Senkung der Monatsspitze, GW", fontsize=8.5)
        ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: de(x, 1 if zoom else 0)))
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 1)))
        ax.tick_params(labelsize=8)
        return ax

    draw(axes[0], xlim=(0, 36), ylim=(0, 4.2), zoom=False)
    axes[0].set_title("Ganze Skala: die Front sitzt oben rechts", fontsize=10, loc="left", fontweight="600", pad=6)
    # Markt/Netz auf der vollen Skala beschriften
    axes[0].annotate(
        "Markt",
        xy=(mkt["revenue_mio_eur"], mkt["reduction_gw"]),
        xytext=(28, 0.7),
        fontsize=8, color=C_MARKT, fontweight="600",
        arrowprops=dict(arrowstyle="-", color=C_MARKT, lw=0.6),
    )
    axes[0].annotate(
        "Netzdienlich",
        xy=(net["revenue_mio_eur"], net["reduction_gw"]),
        xytext=(24, 3.7),
        fontsize=8, color=C_NETZ, fontweight="600",
        arrowprops=dict(arrowstyle="-", color=C_NETZ, lw=0.6),
    )

    draw(axes[1], xlim=(33.70, 34.18), ylim=(0, 4.05), zoom=True)
    axes[1].set_title("Zoom: Form der Front und Knie", fontsize=10, loc="left", fontweight="600", pad=6)

    # gemeinsame Legende
    handles, labels = axes[1].get_legend_handles_labels()
    fig.legend(handles, labels, loc="lower center", ncol=3, fontsize=8, bbox_to_anchor=(0.5, 0.065), frameon=False)

    fig.suptitle(
        f"70 % der Monatssenkung kosten 0,36 % des Erlöses",
        fontsize=14, fontweight="700", x=0.07, ha="left", y=0.97,
    )
    fig.text(
        0.07, 0.915,
        f"Oktober 2026, Zusatzflotte ×2  =  4,64 GW / 8,15 GWh  (battery-charts, Stand 31.10.).  "
        f"Markt {de(mkt['revenue_mio_eur'], 2)} Mio. € bei {de(mkt['reduction_gw'], 2)} GW Senkung,  "
        f"Netzdienlich {de(net['revenue_mio_eur'], 2)} Mio. € bei {de(net['reduction_gw'], 2)} GW.  "
        f"ε-Schnitt 70 %: {de(e70['revenue_mio_eur'], 2)} Mio. € ({de(100*e70['revenue_eur']/mkt['revenue_eur'], 1)} %).",
        fontsize=8, color=C_MUTED, ha="left", va="top", wrap=True,
    )
    fig.text(
        0.07, 0.015,
        "Modellschätzung · HiGHS-LP, Vollvoraussicht, Preisnehmer, Round-Trip 85 %, SoC 10–90 %, Start = Ende = 50 % · "
        "national, kein Netzengpass, keine Intraday-/Regelenergie-/Alterungskosten · Europe/Berlin, Viertelstunden, Energy-Charts/SMARD · "
        "Endpunkte lexikographisch (max. Erlös dann min. Spitze, bzw. umgekehrt).  "
        "λ in € je MW Monatsspitze.  Die linke Skala ist bewusst nicht abgeschnitten.",
        fontsize=6.3, color=C_MUTED, ha="left", va="bottom", wrap=True,
    )
    out = GRAPH / f"g1_pareto_{tag}.png"
    fig.savefig(out, dpi=140 if width > 800 else 160, bbox_inches="tight")
    plt.close(fig)
    return out, dict(mkt=mkt, net=net, e70=e70, fnav=fnav, front=front, cap62=cap62)


def fig_g1_390(rows, fnavb=None):
    fac2 = [r for r in rows if r["factor"] == 2]
    mkt = next(r for r in fac2 if r["source"] == "market_lex")
    net = next(r for r in fac2 if r["source"] == "netz_lex")
    e70 = next(r for r in fac2 if r["source"] == "eps70")
    fnav = next(r for r in fac2 if r["source"] == "fnav_lex")
    front = unique_front(fac2)
    fig, ax = plt.subplots(figsize=(390 / 110, 560 / 110), dpi=120)
    fig.subplots_adjust(left=0.16, right=0.96, top=0.78, bottom=0.22)
    x70, y70 = 0.7 * mkt["revenue_mio_eur"], 0.7 * net["reduction_gw"]
    ax.axhline(y70, color=C_70, ls="--", lw=0.8)
    ax.axvline(x70, color=C_70, ls="--", lw=0.8)
    ax.fill_between([x70, 34.22], y70, 4.05, color=C_70, alpha=0.08, lw=0)
    xs = [p["revenue_mio_eur"] for p in front]
    ys = [p["reduction_gw"] for p in front]
    ax.plot(xs, ys, color=C_INK, lw=1.8)
    ax.scatter([mkt["revenue_mio_eur"]], [mkt["reduction_gw"]], s=50, color=C_MARKT, zorder=5)
    ax.scatter([net["revenue_mio_eur"]], [net["reduction_gw"]], s=50, color=C_NETZ, zorder=5)
    ax.scatter([e70["revenue_mio_eur"]], [e70["reduction_gw"]], s=45, color=C_KOMP, marker="D", zorder=5)
    ax.scatter([fnav["revenue_mio_eur"]], [fnav["reduction_gw"]], s=55, facecolors="none", edgecolors=C_INK, linewidths=1.4, zorder=6)
    ax.annotate("Markt", xy=(mkt["revenue_mio_eur"], mkt["reduction_gw"]),
                xytext=(33.95, 0.55), fontsize=8, color=C_MARKT, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_MARKT, lw=0.6))
    ax.annotate("Netzdienlich", xy=(net["revenue_mio_eur"], net["reduction_gw"]),
                xytext=(33.72, 3.15), fontsize=8, color=C_NETZ, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_NETZ, lw=0.6))
    ax.annotate("70 %", xy=(e70["revenue_mio_eur"], e70["reduction_gw"]),
                xytext=(33.72, 2.15), fontsize=8, color=C_KOMP, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_KOMP, lw=0.6))
    ax.set_xlim(33.70, 34.18)
    ax.set_ylim(0, 4.05)
    ax.grid(True)
    ax.set_xlabel("Erlös, Mio. € (Modellschätzung)", fontsize=8)
    ax.set_ylabel("Senkung, GW", fontsize=8)
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: de(x, 1)))
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 1)))
    ax.tick_params(labelsize=7.5)
    fig.suptitle("70 % Senkung kosten 0,36 % Erlös", fontsize=11, fontweight="700", x=0.16, ha="left", y=0.97)
    fig.text(0.16, 0.90, "Oktober 2026, ×2 = 4,64 GW / 8,15 GWh.\nFront-Zoom, 70/70-Feld grün gestrichelt.", fontsize=7.5, color=C_MUTED, va="top")
    fig.text(0.16, 0.02, "Modellschätzung · HiGHS-LP · Vollvoraussicht, Preisnehmer ·\nnational, Europe/Berlin · fNAV (Kreis) am Markt-Ende.", fontsize=6, color=C_MUTED)
    out = GRAPH / "g1_pareto_390.png"
    fig.savefig(out, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return out


# ---------------------------------------------------------------------------
# G2 Tagesklassen
# ---------------------------------------------------------------------------
KL_COLOR = {
    "win_win": C_WIN,
    "neutral": C_NEUTRAL,
    "konflikt_schwach": C_SCHWACH,
    "konflikt_hebung": C_HEBUNG,
}
KL_LABEL = {
    "win_win": "Win-win (≥ 70 % der netzdienlichen Senkung)",
    "neutral": "Neutral (0–70 %, oder wenig Erlös)",
    "konflikt_schwach": "Konflikt: Erlös hoch, Senkung < 30 %",
    "konflikt_hebung": "Konflikt: Markt hebt die Tagesspitze",
}


def fig_g2(daily, width=1280, height=680, tag="1280"):
    n = len(daily)
    shares = [d["share_of_netz_reduction"] if d["share_of_netz_reduction"] is not None else 0.0 for d in daily]
    colors = [KL_COLOR[d["klasse"]] for d in daily]
    fig, ax = plt.subplots(figsize=(width / 110, height / 110), dpi=110)
    fig.subplots_adjust(left=0.09, right=0.98, top=0.80, bottom=0.28)
    x = np.arange(n)
    ax.bar(x, shares, color=colors, width=0.78, zorder=3, edgecolor="none")
    ax.axhline(0.70, color=C_WIN, ls="--", lw=0.9, zorder=2)
    ax.axhline(0.30, color=C_SCHWACH, ls=":", lw=0.9, zorder=2)
    ax.axhline(0.0, color=C_INK, lw=0.6, zorder=2)
    ax.text(n - 0.4, 0.72, "Win-win-Schwelle 70 %  —  0 Tage", ha="right", va="bottom", color=C_WIN, fontsize=8, fontweight="600")
    ax.text(0.1, 0.32, "Konflikt-Schwelle 30 %", ha="left", va="bottom", color=C_SCHWACH, fontsize=7.5)

    idx = {d["date"]: i for i, d in enumerate(daily)}

    def callout(date, text, color, ytext, ha="center"):
        i = idx[date]
        ax.annotate(
            text,
            xy=(i, shares[i]),
            xytext=(i, ytext),
            ha=ha, va="center",
            fontsize=7, color=color, fontweight="600",
            arrowprops=dict(arrowstyle="-", color=color, lw=0.6),
        )

    callout("2026-10-06", "06.10.\nbester Tag, 46 %", C_INK, 0.58)
    callout("2026-10-03", "03.10.\n41 %", C_INK, 0.58, ha="center")
    callout("2026-10-21", "21.10.\nhebt um 1,31 GW", C_HEBUNG, -0.52)
    callout("2026-10-25", "25.10.\nhebt um 0,63 GW", C_HEBUNG, -0.52)
    # 29.10 sits at +10 %, orange — place to the left above
    i29 = idx["2026-10-29"]
    ax.annotate(
        "29.10. Monatsspitze\n10 % Senkung, 2,11 Mio. €",
        xy=(i29, shares[i29]),
        xytext=(i29 - 3.2, 0.48),
        ha="center", va="center",
        fontsize=7, color=C_SCHWACH, fontweight="600",
        arrowprops=dict(arrowstyle="-", color=C_SCHWACH, lw=0.6),
    )

    ax.set_xlim(-0.7, n - 0.3)
    ax.set_ylim(-0.72, 0.95)
    ax.set_ylabel("Marktsenkung  ÷  netzdienliche Senkung der Tagesspitze", fontsize=8.5)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: f"{de(100*y, 0)} %"))
    ax.set_xticks(x)
    ax.set_xticklabels([d["date"][8:10] + "." for d in daily], fontsize=7)
    ax.set_xlabel("Oktobertag 2026  (Europe/Berlin)", fontsize=8.5)
    ax.grid(True, axis="y", zorder=0)
    ax.tick_params(axis="y", labelsize=8)

    from collections import Counter
    from matplotlib.patches import Patch
    cnt = Counter(d["klasse"] for d in daily)
    order = ["win_win", "neutral", "konflikt_schwach", "konflikt_hebung"]
    handles = [
        Patch(facecolor=KL_COLOR[k], edgecolor="none",
              label=f"{KL_LABEL[k]}  ·  {cnt[k]} Tag{'e' if cnt[k]!=1 else ''}")
        for k in order
    ]
    fig.legend(handles=handles, loc="lower center", ncol=2, fontsize=8, bbox_to_anchor=(0.53, 0.085), frameon=False)

    fig.suptitle(
        "An keinem Oktobertag erreicht der Markt 70 % der Tagesspitzen-Senkung",
        fontsize=13.5, fontweight="700", x=0.09, ha="left", y=0.97,
    )
    fig.text(
        0.09, 0.915,
        "Zusatzflotte ×2, Tageshorizont (SoC Start = Ende = 50 %).  "
        "Regel T (zitierbar, siehe ergebnis.md):  Win-win = Marktsenkung ≥ 70 % der netzdienlichen Senkung "
        "(und diese ≥ 0,10 GW).  Konflikt-Hebung = der Markt hebt die Tagesspitze um mehr als 0,01 GW.  "
        "Konflikt-schwach = Senkung < 30 % und Tageserlös ≥ 50 % des Monatsmaximums.  Sonst neutral.",
        fontsize=7.5, color=C_MUTED, va="top",
    )
    fig.text(
        0.09, 0.012,
        "Zählung: 0 Win-win, 18 neutral, 11 Konflikt-schwach, 2 Konflikt-Hebung.  "
        "Der Markt-Fahrplan erreicht an jedem Tag 100 % des maximalen Tageserlöses, die 70-%-Erlös-Schwelle von H1 ist nicht bindend.  "
        "Höchster Anteil: 06.10. mit 46 % (1,77 von 3,86 GW).  Am 29.10. (Monatsspitze 64,41 GW) nur 10 %, bei gleichzeitig höchstem Tageserlös (2,11 Mio. €, Modellschätzung).  "
        "Kein Widerspruch zur Monatsfront: die Monatsspitze sitzt in wenigen Stunden, die Tagesspitze jeden Abend.  Energy-Charts, Europe/Berlin, Viertelstunden.",
        fontsize=6.3, color=C_MUTED, va="bottom",
    )
    out = GRAPH / f"g2_tagesklassen_{tag}.png"
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)
    return out


def fig_g2_390(daily):
    n = len(daily)
    shares = [d["share_of_netz_reduction"] if d["share_of_netz_reduction"] is not None else 0.0 for d in daily]
    colors = [KL_COLOR[d["klasse"]] for d in daily]
    fig, ax = plt.subplots(figsize=(390 / 110, 540 / 110), dpi=120)
    fig.subplots_adjust(left=0.18, right=0.97, top=0.78, bottom=0.28)
    x = np.arange(n)
    ax.bar(x, shares, color=colors, width=0.8, zorder=3)
    ax.axhline(0.70, color=C_WIN, ls="--", lw=0.8)
    ax.axhline(0.0, color=C_INK, lw=0.5)
    ax.set_ylim(-0.7, 0.9)
    ax.set_xlim(-0.7, n - 0.3)
    ax.set_ylabel("Markt / Netz, Tagesspitze", fontsize=7.5)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: f"{de(100*y, 0)} %"))
    ax.set_xticks([0, 5, 9, 14, 20, 24, 28, 30])
    ax.set_xticklabels(["1.", "6.", "10.", "15.", "21.", "25.", "29.", "31."], fontsize=7)
    ax.tick_params(labelsize=7)
    ax.grid(True, axis="y")
    ax.text(20, -0.55, "21.10.", color=C_HEBUNG, fontsize=6.5, ha="center", fontweight="600")
    ax.text(28, 0.28, "29.10.", color=C_SCHWACH, fontsize=6.5, ha="center", fontweight="600")
    fig.suptitle("0 von 31 Tagen über der 70-%-Schwelle", fontsize=10.5, fontweight="700", x=0.18, ha="left", y=0.97)
    fig.text(0.18, 0.90, "Oktober, ×2, Tageshorizont.\nRot: Markt hebt die Spitze.  Orange: hoher Erlös, Senkung < 30 %.",
             fontsize=7, color=C_MUTED, va="top")
    fig.text(0.18, 0.02, "Regel T in ergebnis.md.  Modellschätzung.  Europe/Berlin.", fontsize=6, color=C_MUTED)
    out = GRAPH / "g2_tagesklassen_390.png"
    fig.savefig(out, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return out


# ---------------------------------------------------------------------------
# G3 Tageskurven 21.10 und 29.10  —  zwei Spalten, mit Laden/Entladen
# ---------------------------------------------------------------------------
def ensure_daily_compromise():
    """ε-70 %-Senkung je Beispieltag, Tageshorizont."""
    intervals = load_intervals()
    by = daily_indices(intervals)
    out = {}
    for day in ("2026-10-21", "2026-10-29"):
        path = ROOT / "dispatch" / "daily" / f"{day}_eps70.csv"
        sl = slice_day(intervals, by[day])
        net = load_disp(ROOT / "dispatch" / "daily" / f"{day}_peak.csv")
        red_max = (net["R"].max() - net["Rp"].max())
        pub = net["R"].max() - 0.70 * red_max
        r, c, d, e = solve_mode(sl, 2, "price", peak_ub=pub + 0.05, name=f"{day}_eps70")
        save_dispatch(path, sl, c, d, e, r)
        out[day] = dict(rev=r.revenue_eur, red=r.reduction_mw / 1e3, peak=r.peak_mw / 1e3)
        print(f"  daily eps70 {day}: red={r.reduction_mw/1e3:.3f} GW  rev={r.revenue_eur/1e6:.3f} Mio  peak={r.peak_mw/1e3:.3f}")
    return out


def _hours(ts):
    return np.array([t.hour + t.minute / 60 + t.second / 3600 for t in ts])


def _fill_laden_entladen(ax, h, R, Rp, alpha=0.22):
    """Fläche zwischen beobachtet und Fahrplan: oben = lädt, unten = entlädt."""
    R, Rp = R / 1e3, Rp / 1e3
    laden = Rp >= R
    ax.fill_between(h, R, Rp, where=laden, color=C_CHARGE, alpha=alpha, lw=0, zorder=1, interpolate=True)
    ax.fill_between(h, R, Rp, where=~laden, color=C_DISCH, alpha=alpha, lw=0, zorder=1, interpolate=True)


def fig_g3(width=1280, height=980, tag="1280"):
    fig = plt.figure(figsize=(width / 110, height / 110), dpi=110)
    # 2 Spalten × 3 Zeilen (Restlast, Fahrplan c−d, Preis)
    gs = fig.add_gridspec(3, 2, height_ratios=[2.4, 0.85, 0.7], hspace=0.08, wspace=0.22,
                          left=0.07, right=0.98, top=0.84, bottom=0.09)
    specs = {
        "2026-10-21": dict(
            col=0,
            title="21.10.  —  der Markt lädt mittags und hebt die Tagesspitze",
            tz="MESZ, UTC+2",
        ),
        "2026-10-29": dict(
            col=1,
            title="29.10.  —  Preis- und Restlastspitze liegen eine Stunde auseinander",
            tz="MEZ, UTC+1",
        ),
    }

    legend_handles = None
    for day, sp in specs.items():
        col = sp["col"]
        ax_r = fig.add_subplot(gs[0, col])
        ax_f = fig.add_subplot(gs[1, col], sharex=ax_r)
        ax_p = fig.add_subplot(gs[2, col], sharex=ax_r)

        m = load_disp(ROOT / "dispatch" / "daily" / f"{day}_price.csv")
        n = load_disp(ROOT / "dispatch" / "daily" / f"{day}_peak.csv")
        k = load_disp(ROOT / "dispatch" / "daily" / f"{day}_eps70.csv")
        h = _hours(m["ts"])

        for a in (ax_r, ax_f, ax_p):
            a.axvspan(23.0, 24.0, color=C_HATCH, alpha=0.55, lw=0, zorder=0)
            a.set_xlim(0, 24)
            a.grid(True, zorder=0)
            a.set_xticks([0, 4, 8, 12, 16, 18, 20, 24])

        # --- Restlast
        _fill_laden_entladen(ax_r, h, m["R"], m["Rp"], alpha=0.20)
        ax_r.plot(h, m["R"] / 1e3, color=C_OBS, lw=1.2, label="beobachtet (ohne Zusatzflotte)", zorder=3)
        ax_r.plot(h, m["Rp"] / 1e3, color=C_MARKT, lw=1.7, label="nach Markt-Fahrplan", zorder=4)
        ax_r.plot(h, n["Rp"] / 1e3, color=C_NETZ, lw=1.7, label="nach netzdienlichem Fahrplan", zorder=4)
        ax_r.plot(h, k["Rp"] / 1e3, color=C_KOMP, lw=1.25, ls="--", label="Kompromiss (70 % der Tagessenkung)", zorder=5)
        ax_r.set_ylabel("Restlast, GW", fontsize=8)
        ax_r.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 0)))
        ax_r.tick_params(labelsize=7.5, labelbottom=False)
        ax_r.set_title(sp["title"], fontsize=9.5, fontweight="600", loc="left", pad=6)

        # --- Fahrplan: Entlade- minus Ladeleistung (GW), Markt und Netz
        # positiv = entlädt (ins Netz), negativ = lädt (aus dem Netz)
        step_h = np.repeat(h, 2)
        # last step edge +0.25 h
        # use stairs
        ax_f.axhline(0, color=C_INK, lw=0.5, zorder=2)
        ax_f.step(h, (m["d"] - m["c"]) / 1e3, where="post", color=C_MARKT, lw=1.3, zorder=4, label="Markt: + entlädt, − lädt")
        ax_f.step(h, (n["d"] - n["c"]) / 1e3, where="post", color=C_NETZ, lw=1.3, zorder=4, label="Netzdienlich: + entlädt, − lädt")
        ax_f.fill_between(h, 0, (m["d"] - m["c"]) / 1e3, step="post", color=C_MARKT, alpha=0.12, lw=0)
        ax_f.set_ylabel("Fahrplan, GW", fontsize=7.5)
        ax_f.set_ylim(-5.2, 5.2)
        ax_f.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 0)))
        ax_f.tick_params(labelsize=7, labelbottom=False)
        ax_f.text(0.15, 4.3, "+ entlädt", fontsize=6.3, color=C_DISCH, fontweight="600", va="top")
        ax_f.text(0.15, -4.3, "− lädt", fontsize=6.3, color=C_CHARGE, fontweight="600", va="bottom")

        # --- Preis
        ax_p.plot(h, m["p"], color=C_PRICE, lw=1.25, zorder=3)
        ax_p.set_ylabel("€/MWh", fontsize=7.5, color=C_PRICE)
        ax_p.tick_params(labelsize=7, colors=C_PRICE)
        ax_p.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 0)))
        ax_p.set_xlabel(f"Uhrzeit, Europe/Berlin ({sp['tz']})", fontsize=8)
        ax_p.set_xticklabels([f"{h:02d}:00" for h in [0, 4, 8, 12, 16, 18, 20, 24]], fontsize=7)

        # SoC-Artefakt
        ymax = ax_r.get_ylim()[1]
        ax_r.text(23.5, ax_r.get_ylim()[0] + 0.92 * (ax_r.get_ylim()[1] - ax_r.get_ylim()[0]),
                  "SoC-Rückkehr\n(Modell)", ha="center", va="top", fontsize=6, color=C_MUTED, style="italic")

        if day == "2026-10-21":
            i = int(np.argmax(m["Rp"]))
            ax_r.annotate(
                f"Markt lädt {de(m['c'][i]/1e3, 2)} GW\nneue Tagesspitze {de(m['Rp'][i]/1e3, 2)} GW  14:00",
                xy=(h[i], m["Rp"][i] / 1e3),
                xytext=(6.2, m["Rp"][i] / 1e3 + 1.2),
                fontsize=7, color=C_MARKT, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_MARKT, lw=0.6),
            )
            je = int(np.argmax(m["R"]))
            ax_r.annotate(
                f"beobachtet {de(m['R'][je]/1e3, 2)} GW  18:30",
                xy=(h[je], m["R"][je] / 1e3),
                xytext=(19.0, m["R"][je] / 1e3 + 4.5),
                fontsize=7, color=C_OBS,
                arrowprops=dict(arrowstyle="-", color=C_OBS, lw=0.6),
            )
            ax_r.annotate(
                f"Netzdienlich {de(n['Rp'].max()/1e3, 2)} GW\n(−{de((n['R'].max()-n['Rp'].max())/1e3, 2)} GW)",
                xy=(18.5, n["Rp"].max() / 1e3),
                xytext=(19.2, n["Rp"].max() / 1e3 - 8),
                fontsize=7, color=C_NETZ, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_NETZ, lw=0.6),
            )
        else:
            ip = int(np.argmax(m["p"]))
            ir = int(np.argmax(m["R"]))
            ax_p.annotate(
                f"Preismax. {de(m['p'][ip], 0)} €/MWh  17:15",
                xy=(h[ip], m["p"][ip]),
                xytext=(8.0, m["p"][ip] - 50),
                fontsize=7, color=C_PRICE, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_PRICE, lw=0.6),
            )
            ax_r.annotate(
                f"Restlastspitze {de(m['R'][ir]/1e3, 2)} GW  18:15\nMarkt entlädt nur noch {de(m['d'][ir]/1e3, 2)} GW",
                xy=(h[ir], m["R"][ir] / 1e3),
                xytext=(7.5, m["R"][ir] / 1e3 + 1.5),
                fontsize=7, color=C_MARKT, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_MARKT, lw=0.6),
            )
            ax_r.annotate(
                f"Netzdienlich hält auf {de(n['Rp'].max()/1e3, 2)} GW\n(16:45–19:00)",
                xy=(17.0, n["Rp"].max() / 1e3),
                xytext=(4.0, n["Rp"].max() / 1e3 - 10),
                fontsize=7, color=C_NETZ, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_NETZ, lw=0.6),
            )
            # full discharge window 17-18 on Fahrplan axis
            ax_f.annotate(
                "Markt entlädt voll\n17:00–18:00",
                xy=(17.25, 4.4),
                xytext=(10.5, 3.6),
                fontsize=6.5, color=C_MARKT, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_MARKT, lw=0.6),
            )

        if legend_handles is None:
            legend_handles, legend_labels = ax_r.get_legend_handles_labels()

    fig.legend(legend_handles, legend_labels, loc="upper right", fontsize=7.5,
               bbox_to_anchor=(0.98, 0.895), ncol=2, frameon=False)

    fig.suptitle(
        "Wo Markt und Netz gleich fahren — und wo sie sich trennen",
        fontsize=14, fontweight="700", x=0.07, ha="left", y=0.98,
    )
    fig.text(
        0.07, 0.935,
        "Zusatzflotte ×2, Tageshorizont, SoC Start = Ende = 50 %.  "
        "Die Fläche an der Restlast zeigt den Markt-Fahrplan: ocker = lädt (Restlast steigt), petrol = entlädt (Restlast sinkt).  "
        "Die mittlere Spur ist der Fahrplan in GW, positiv = Entladen ins Netz.  "
        "Graues Band 23–24 Uhr: Nachladen zur SoC-Rückkehr auf 50 %, Modellartefakt, kein Netzeffekt.  "
        "Kompromiss = max. Tageserlös unter 70 % der netzdienlichen Tagessenkung.",
        fontsize=7.2, color=C_MUTED, va="top",
    )
    fig.text(
        0.07, 0.008,
        "Modellschätzung · HiGHS-LP · Vollvoraussicht, Preisnehmer, Round-Trip 85 %, SoC 10–90 % · national, kein Netzengpass.  "
        "Am 21.10. liegt die gehobene Tagesspitze (55,60 GW) noch unter der Monatsspitze (64,41 GW); dasselbe Mittagsladen übersteigt die Monatsspitze ab ≈ ×3,9.  "
        "Am 29.10. fällt der Preis ab 17:15, die Restlastspitze kommt erst um 18:15 — der Markt hat die Energie schon abgegeben.  "
        "Energy-Charts total_power und Day-Ahead DE-LU, Europe/Berlin, Viertelstunden.",
        fontsize=6.1, color=C_MUTED, va="bottom",
    )
    out = GRAPH / f"g3_tage_{tag}.png"
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)
    return out


def fig_g3_390():
    day = "2026-10-21"
    m = load_disp(ROOT / "dispatch" / "daily" / f"{day}_price.csv")
    n = load_disp(ROOT / "dispatch" / "daily" / f"{day}_peak.csv")
    k = load_disp(ROOT / "dispatch" / "daily" / f"{day}_eps70.csv")
    hm = _hours(m["ts"])
    fig, (ax, axf, axp) = plt.subplots(
        3, 1, figsize=(390 / 110, 580 / 110), dpi=120,
        gridspec_kw={"height_ratios": [2.4, 0.75, 0.7], "hspace": 0.08},
    )
    fig.subplots_adjust(left=0.17, right=0.96, top=0.76, bottom=0.13)
    for a in (ax, axf, axp):
        a.axvspan(23, 24, color=C_HATCH, alpha=0.5, lw=0)
        a.set_xlim(0, 24)
        a.grid(True)
    _fill_laden_entladen(ax, hm, m["R"], m["Rp"], alpha=0.22)
    ax.plot(hm, m["R"] / 1e3, color=C_OBS, lw=1.0, label="beobachtet")
    ax.plot(hm, m["Rp"] / 1e3, color=C_MARKT, lw=1.5, label="Markt")
    ax.plot(hm, n["Rp"] / 1e3, color=C_NETZ, lw=1.5, label="Netzdienlich")
    ax.plot(hm, k["Rp"] / 1e3, color=C_KOMP, lw=1.1, ls="--", label="70 %-Kompromiss")
    ax.set_ylabel("Restlast, GW", fontsize=7.5)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 0)))
    ax.tick_params(labelsize=7, labelbottom=False)
    ax.legend(fontsize=6.2, loc="upper left", ncol=2)
    axf.axhline(0, color=C_INK, lw=0.5)
    axf.step(hm, (m["d"] - m["c"]) / 1e3, where="post", color=C_MARKT, lw=1.15)
    axf.step(hm, (n["d"] - n["c"]) / 1e3, where="post", color=C_NETZ, lw=1.15)
    axf.set_ylim(-5.2, 5.2)
    axf.set_ylabel("Fahrplan, GW", fontsize=7)
    axf.tick_params(labelsize=6.5, labelbottom=False)
    axf.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 0)))
    axp.plot(hm, m["p"], color=C_PRICE, lw=1.1)
    axp.set_xticks([0, 6, 12, 18, 24])
    axp.set_xticklabels(["00", "06", "12", "18", "24"], fontsize=7)
    axp.set_ylabel("€/MWh", fontsize=7, color=C_PRICE)
    axp.tick_params(labelsize=6.5, colors=C_PRICE)
    axp.set_xlabel("Uhrzeit, 21.10., Europe/Berlin (MESZ)", fontsize=7)
    axp.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 0)))
    fig.suptitle("21.10.: Markt lädt mittags, Spitze steigt", fontsize=10.5, fontweight="700", x=0.17, ha="left", y=0.97)
    fig.text(0.17, 0.90, "Neue Tagesspitze 55,60 GW um 14:00 (+1,31 GW).\nNetz senkt auf 51,68 GW.  Ocker = lädt, petrol = entlädt.",
             fontsize=7, color=C_MUTED, va="top")
    fig.text(0.17, 0.015, "Graues Band 23–24: SoC-Rückkehr (Modell).\nModellschätzung, ×2, Tageshorizont.", fontsize=6, color=C_MUTED)
    out = GRAPH / "g3_tage_390.png"
    fig.savefig(out, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return out


# ---------------------------------------------------------------------------
# G4 fNAV + Kipppunkt (GW, keine Euro für ×>2)
# ---------------------------------------------------------------------------
def fig_g4(rows, kipp, fnavb, width=1280, height=700, tag="1280"):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(width / 110, height / 110), dpi=110)
    fig.subplots_adjust(left=0.08, right=0.98, top=0.78, bottom=0.20, wspace=0.28)

    # links: normalisierte Fronten. y ehrlich bis unter 0, ×10-Markt-Ende annotiert (liegt bei −203 %).
    for fac, col, lbl, mk in [
        (2, C_INK, "×2  (4,64 GW zusätzlich)", "o"),
        (5, C_KOMP, "×5  (18,58 GW, Preisnehmer)", "o"),
        (10, C_MARKT, "×10  (41,80 GW, Preisnehmer)", "o"),
    ]:
        fac_rows = [r for r in rows if r["factor"] == fac]
        mkt = next(r for r in fac_rows if r["source"] == "market_lex")
        net = next(r for r in fac_rows if r["source"] == "netz_lex")
        front = unique_front(fac_rows, min_dred_mw=1.0, min_drev=100)
        xs = [p["revenue_eur"] / mkt["revenue_eur"] * 100 for p in front]
        ys = [p["reduction_mw"] / net["reduction_mw"] * 100 for p in front]
        ax1.plot(xs, ys, color=col, lw=1.7, label=lbl, zorder=4)
        ax1.scatter(xs, ys, s=16, color=col, zorder=5, linewidths=0)
        ax1.scatter([net["revenue_eur"] / mkt["revenue_eur"] * 100], [100], s=42, color=col, marker="s", zorder=6)
        e70 = next(r for r in fac_rows if r["source"] == "eps70")
        ax1.scatter(
            [e70["revenue_eur"] / mkt["revenue_eur"] * 100],
            [e70["reduction_mw"] / net["reduction_mw"] * 100],
            s=42, color=col, marker="D", zorder=6,
        )
        # Markt-Ende: bei ×5/×10 unterhalb 0
        y_m = mkt["reduction_mw"] / net["reduction_mw"] * 100
        if y_m >= -25:
            ax1.scatter([100], [y_m], s=42, color=col, zorder=6)
        else:
            # liegt weit unterhalb: Pfeil an den unteren Rand
            ax1.annotate(
                f"×{fac} Markt: {de(y_m, 0)} %\n(neue Spitze {de(mkt['peak_gw'], 2)} GW)\naußerhalb der Achse",
                xy=(100, -25),
                xytext=(91.5, -12),
                fontsize=6.5, color=col, fontweight="600",
                arrowprops=dict(arrowstyle="->", color=col, lw=0.7),
            )

    ax1.axhline(70, color=C_70, ls="--", lw=0.8)
    ax1.axvline(70, color=C_70, ls="--", lw=0.8)
    ax1.fill_between([70, 101.5], 70, 115, color=C_70, alpha=0.10, lw=0)
    ax1.text(84, 108, "70/70-Feld: der 70-%-Schnitt\nliegt bei allen drei Größen darin", color=C_70, fontsize=7.2, fontweight="600")
    ax1.axhline(0, color=C_INK, lw=0.5)
    ax1.set_xlim(90, 101.5)
    ax1.set_ylim(-28, 118)
    ax1.set_xlabel("Anteil am jeweiligen Markt-Erlös, %", fontsize=8.5)
    ax1.set_ylabel("Anteil an der jeweiligen max. Senkung, %", fontsize=8.5)
    ax1.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: de(x, 0)))
    ax1.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 0)))
    ax1.grid(True)
    ax1.tick_params(labelsize=8)
    ax1.set_title("Normalisierte Front: H3 gilt auch bei ×5 und ×10", fontsize=10, fontweight="600", loc="left")
    ax1.legend(fontsize=6.8, loc="center left")
    ax1.text(
        90.3, -26.5,
        "Euro-Beträge für ×5/×10 werden nicht ausgewiesen (Preisnehmer bricht).\n"
        "y = 0 bedeutet: keine Änderung der beobachteten Monatsspitze.  Die Achse ist bei −28 % bewusst begrenzt;\n"
        "der ×10-Markt-Punkt läge bei −203 % und ist beschriftet, nicht abgeschnitten-verschwiegen.",
        fontsize=5.9, color=C_MUTED, va="bottom",
    )

    # rechts: Kipppunkt
    kf = list(csv.DictReader((ROOT / "kipppunkt.csv").open(encoding="utf-8")))
    facs = [float(r["factor"]) for r in kf]
    peaks = [float(r["peak_gw"]) for r in kf]
    ax2.axhline(64.4059, color=C_OBS, ls="--", lw=1.0, label="beobachtete Monatsspitze 64,41 GW")
    ax2.plot(facs, peaks, color=C_MARKT, lw=1.8, zorder=4, label="Monatsspitze unter Markt-Fahrplan")
    ax2.scatter(facs, peaks, s=28, color=C_MARKT, zorder=5)
    for r in kf:
        if abs(float(r["factor"]) - 3.8) < 1e-9:
            ax2.annotate(
                f"×3,8   {de(float(r['peak_gw']), 2)} GW\nnoch 29.10., 18:45",
                xy=(3.8, float(r["peak_gw"])),
                xytext=(2.15, 66.6),
                fontsize=7, color=C_INK,
                arrowprops=dict(arrowstyle="-", color=C_INK, lw=0.6),
            )
        if abs(float(r["factor"]) - 3.9) < 1e-9:
            ax2.annotate(
                f"×3,9   {de(float(r['peak_gw']), 2)} GW\nneu: 21.10., 14:00",
                xy=(3.9, float(r["peak_gw"])),
                xytext=(4.35, 63.15),
                fontsize=7, color=C_HEBUNG, fontweight="600",
                arrowprops=dict(arrowstyle="-", color=C_HEBUNG, lw=0.6),
            )
    ax2.annotate(
        "×2   64,04 GW\n(Senkung 0,37 GW)",
        xy=(2, peaks[0]),
        xytext=(2.05, 62.55),
        fontsize=7, color=C_MARKT,
    )
    ax2.set_xlim(1.8, 5.3)
    ax2.set_ylim(61.5, 71)
    ax2.set_xlabel("Flottenfaktor ×k    (Zusatz = (k−1) × 4,64 GW)", fontsize=8.5)
    ax2.set_ylabel("höchste Restlast des Monats, GW", fontsize=8.5)
    ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 1)))
    ax2.grid(True)
    ax2.tick_params(labelsize=8)
    ax2.set_title("Kipppunkt: neue Monatsspitze ab ≈ ×3,9", fontsize=10, fontweight="600", loc="left")
    ax2.legend(fontsize=7, loc="upper left")
    ax2.text(
        1.9, 61.65,
        "Analytisch: Restlast 21.10. 14:00 = 50,96 GW plus Voll-Laden.\n"
        "(k−1) = (64,41 − 50,96) / 4,644 = 2,90   →   k = 3,90.\n"
        "Ohne Preisrückwirkung (H3 aus konzept_monat bleibt offen).",
        fontsize=6.3, color=C_MUTED, va="bottom",
    )

    fig.suptitle(
        "Der Vertrag muss die Spitze deckeln — ein Abend-Ladeverbot reicht nicht",
        fontsize=13.5, fontweight="700", x=0.08, ha="left", y=0.97,
    )
    fig.text(
        0.08, 0.905,
        "Links: dieselbe Front in Anteilen, damit ×5 und ×10 ohne Euro-Beträge vergleichbar sind.  "
        "Die Raute ist der ε-Schnitt 70 % der max. Senkung.  "
        "Rechts: unter dem Markt-Fahrplan wandert die Monatsspitze zwischen ×3,8 (noch 29.10. 18:45) und ×3,9 (21.10. 14:00) über die beobachteten 64,41 GW.  "
        "Das abendliche Entnahmeverbot 16–21 Uhr verhindert dieses Mittagsladen nicht.",
        fontsize=7.4, color=C_MUTED, va="top",
    )
    fig.text(
        0.08, 0.012,
        "Modellschätzung nur für ×2; ×5/×10 nur als Form der Front und als GW-Werte, Preisnehmer.  "
        "HiGHS-LP, Vollvoraussicht, Round-Trip 85 %, Konvention (a).  "
        "Ein wirksames stilisiertes fNAV ist ein Leistungsdeckel auf die Restlast nach Speicher (ε-Schnitt), nicht nur ein Uhrzeit-Fenster auf die Entnahme.  "
        "Europe/Berlin, Oktober 2026, Energy-Charts.",
        fontsize=6.2, color=C_MUTED, va="bottom",
    )
    out = GRAPH / f"g4_fnav_kipppunkt_{tag}.png"
    fig.savefig(out, dpi=140, bbox_inches="tight")
    plt.close(fig)
    return out


def fig_g4_390(rows):
    kf = list(csv.DictReader((ROOT / "kipppunkt.csv").open(encoding="utf-8")))
    facs = [float(r["factor"]) for r in kf]
    peaks = [float(r["peak_gw"]) for r in kf]
    fig, ax = plt.subplots(figsize=(390 / 110, 500 / 110), dpi=120)
    fig.subplots_adjust(left=0.18, right=0.96, top=0.76, bottom=0.22)
    ax.axhline(64.4059, color=C_OBS, ls="--", lw=1, label="beobachtet 64,41 GW")
    ax.plot(facs, peaks, color=C_MARKT, lw=1.8)
    ax.scatter(facs, peaks, s=24, color=C_MARKT)
    ax.annotate(
        "×3,9\nneue Spitze\n21.10. 14:00",
        xy=(3.9, 64.43), xytext=(4.15, 66.9),
        fontsize=7, color=C_HEBUNG, fontweight="600",
        arrowprops=dict(arrowstyle="-", color=C_HEBUNG, lw=0.6),
    )
    ax.set_xlim(1.8, 5.3)
    ax.set_ylim(62, 71)
    ax.set_xlabel("×k  (Zusatz = (k−1)×4,64 GW)", fontsize=8)
    ax.set_ylabel("Monatsspitze, GW", fontsize=8)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda y, p: de(y, 1)))
    ax.grid(True)
    ax.tick_params(labelsize=7)
    ax.legend(fontsize=6.5, loc="upper left")
    fig.suptitle("Neue Monatsspitze ab ≈ ×3,9", fontsize=11, fontweight="700", x=0.18, ha="left", y=0.97)
    fig.text(
        0.18, 0.90,
        "Markt-Fahrplan, Preisnehmer.\nZwischen ×3,8 und ×3,9 wechselt die Spitze auf den 21.10., 14:00.",
        fontsize=7, color=C_MUTED, va="top",
    )
    fig.text(0.18, 0.02, "Ohne Preisrückwirkung.  Konvention (a).\nEurope/Berlin, Oktober 2026.", fontsize=6, color=C_MUTED)
    out = GRAPH / "g4_fnav_kipppunkt_390.png"
    fig.savefig(out, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return out



def main():
    print("Lade Daten …")
    rows = load_pareto()
    daily = load_daily()
    fnavb = json.loads((ROOT / "fnavB.json").read_text()) if (ROOT / "fnavB.json").exists() else {}
    print("Tages-Kompromiss 70 % …")
    ensure_daily_compromise()
    print("G1 …")
    p1, meta = fig_g1(rows, fnavb)
    fig_g1_390(rows, fnavb)
    print("G2 …")
    fig_g2(daily)
    fig_g2_390(daily)
    print("G3 …")
    fig_g3()
    fig_g3_390()
    print("G4 …")
    fig_g4(rows, None, fnavb)
    fig_g4_390(rows)
    print("fertig:")
    for p in sorted(GRAPH.glob("*.png")):
        print(f"  {p.name}  {p.stat().st_size/1024:.0f} kB")
    # meta für Prüfprotokoll
    (ROOT / "protokoll" / "viz_meta.json").write_text(
        json.dumps(
            {
                "mkt_mio": meta["mkt"]["revenue_mio_eur"],
                "mkt_red": meta["mkt"]["reduction_gw"],
                "net_mio": meta["net"]["revenue_mio_eur"],
                "net_red": meta["net"]["reduction_gw"],
                "e70_mio": meta["e70"]["revenue_mio_eur"],
                "e70_red": meta["e70"]["reduction_gw"],
                "fnav_mio": meta["fnav"]["revenue_mio_eur"],
                "fnav_red": meta["fnav"]["reduction_gw"],
                "n_front": len(meta["front"]),
            },
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
