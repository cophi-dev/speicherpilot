# -*- coding: utf-8 -*-
"""Zahlen und Reihen der Simulator-Rechnung v1. Keine Schätzwerte."""
from __future__ import annotations

import csv
import json
from pathlib import Path

NBSP = "\u00A0"
MINUS = "\u2212"
TIMES = "\u00D7"

RECHNUNG = Path("/workspace/speicherpilot/forschung/simulator_rechnung_v1")

# Flottenbasis, Konvention (a), gerundet wie im Bau-Brief
FLEET_GW = 4.64
FLEET_GWH = 8.15
FLEET_GW_EXACT = 4.64409022
FLEET_GWH_EXACT = 8.1524588
OBS_PEAK_GW = 64.41  # 64 405,9 MW
OBS_PEAK_MW = 64405.9
OBS_PEAK_TS = "29.10. 18:15"

def dec(x: float, d: int = 2) -> str:
    s = f"{x:.{d}f}".replace(".", ",")
    return s

def gw(x: float, d: int = 2) -> str:
    return f"{dec(x, d)}{NBSP}GW"

def mio(x: float, d: int = 2) -> str:
    return f"{dec(x, d)}{NBSP}Mio.{NBSP}€"

def pct(x: float, d: int = 2) -> str:
    return f"{dec(x, d)}{NBSP}%"


# --- Lex-Endpunkte und Schnitte, ×2, aus pareto_punkte.csv / viz_meta ---
MARKT = dict(rev=34.0899055434177, red=0.36590706637973924, peak=64.03999293362027, frac_rev=1.0, frac_red=0.1019)
NETZ = dict(rev=33.78626679142366, red=3.590312602971164, peak=60.815587397028835, frac_rev=0.991093, frac_red=1.0)
EPS50 = dict(rev=34.02970548591698, red=1.7951063014855826, peak=62.61079369851442, frac_rev=0.998234, frac_red=0.50)
EPS70 = dict(rev=33.96669041531575, red=2.5131688220798094, peak=61.89273117792019, frac_rev=0.996386, frac_red=0.70)
EPS90 = dict(rev=33.862089, red=3.231231, peak=61.174669, frac_rev=0.993317, frac_red=0.90)
FNAV_FENSTER = dict(rev=33.99615220509994, red=0.365907066381842, peak=64.03999293361817, frac_rev=0.99725, frac_red=0.1019)
FNAV_DECKEL62 = dict(rev=33.97798612840939, red=2.4059, peak=62.0, frac_rev=0.99672, frac_red=0.6701)
# fnavB 2_cap62 revenue was 33977986.12840939 = 33.977986

# Anzeige (zwei Dezimalen, außer wo das Ergebnis drei nennt)
A = dict(
    markt_rev=34.09,
    markt_red=0.37,
    markt_peak=64.04,
    netz_rev=33.79,
    netz_red=3.59,
    netz_peak=60.82,
    k_rev=33.97,
    k_red=2.51,
    k_peak=61.89,
    k_frac=99.64,
    k_cost_pct=0.36,
    voll_cost=0.30,
    voll_cost_pct=0.89,
    voll_cost_eur=303638.75,
    eps50_rev=34.03,
    eps50_red=1.80,
    eps90_rev=33.86,
    eps90_red=3.23,
    fnav_f_rev=34.00,
    fnav_f_red=0.37,
    fnav_f_frac=99.7,
    deckel_rev=33.98,
    deckel_red=2.41,
    deckel_frac=99.7,
    kipppunkt=3.9,
    x10_markt=92.76,
    x10_netz=50.43,
    x5_netz=54.99,
    x38_peak=64.04,
    x39_peak=64.43,
    r2110_14=50.96,
)


def unique_front_x2():
    """Dichotomie + ε-50/70/90 + lex-Endpunkte, eindeutig auf 0,001 Mio / 0,01 GW."""
    rows = list(csv.DictReader((RECHNUNG / "pareto_punkte.csv").open()))
    pts = []
    seen = set()
    order = []
    for r in rows:
        if r["factor"] != "2":
            continue
        if r["source"] not in ("market_lex", "netz_lex", "eps50", "eps70", "eps90", "dichotomy"):
            continue
        rev, red, peak = float(r["revenue_mio_eur"]), float(r["reduction_gw"]), float(r["peak_gw"])
        key = (round(rev, 3), round(red, 2))
        if key in seen:
            continue
        seen.add(key)
        name = {
            "market_lex": "markt",
            "netz_lex": "netz",
            "eps50": "eps50",
            "eps70": "kompromiss",
            "eps90": "eps90",
        }.get(r["source"])
        pts.append(
            dict(
                source=r["source"],
                name=name,
                rev=rev,
                red=red,
                peak=peak,
                lam=r["lam_eur_per_mw"],
                frac_rev=float(r["frac_rev"]),
                frac_red=float(r["frac_red"]),
            )
        )
    pts.sort(key=lambda p: p["red"])  # Markt (wenig Senkung) → Netzdienlich
    return pts


def tagesklassen():
    rows = list(csv.DictReader((RECHNUNG / "tagesklassen_oktober.csv").open()))
    out = []
    for r in rows:
        out.append(
            dict(
                date=r["date"],
                day=int(r["date"][-2:]),
                klasse=r["klasse"],
                share=float(r["share_of_netz_reduction"]),
                dM=float(r["market_reduction_gw"]),
                dN=float(r["netz_reduction_gw"]),
                rev=float(r["market_revenue_eur"]),
                raises=r["market_raises_peak"] == "True",
                spread=float(r["spread_eur_mwh"]),
            )
        )
    return out


def load_day(date: str, mode: str):
    p = RECHNUNG / "dispatch" / "daily" / f"{date}_{mode}.csv"
    rows = list(csv.DictReader(p.open()))
    ts, residual, prime, charge, discharge, price, soc = [], [], [], [], [], [], []
    for r in rows:
        ts.append(r["timestamp_berlin"])
        residual.append(float(r["residual_mw"]) / 1000.0)
        prime.append(float(r["residual_prime_mw"]) / 1000.0)
        charge.append(float(r["c_mw"]) / 1000.0)
        discharge.append(float(r["d_mw"]) / 1000.0)
        price.append(float(r["day_ahead_eur_mwh"]))
        soc.append(float(r["soc_mwh"]))
    return dict(
        ts=ts, residual=residual, prime=prime, charge=charge, discharge=discharge, price=price, soc=soc
    )


def kipppunkt_market():
    rows = list(csv.DictReader((RECHNUNG / "kipppunkt.csv").open()))
    pts = [dict(k=float(r["factor"]), peak=float(r["peak_gw"]), ts=r["peak_ts"]) for r in rows]
    # ×1 (beobachtet) und ×10 analytisch ergänzen
    return pts


# Tageszahlen 21.10 / 29.10 (aus ergebnis.md, zur Beschriftung)
TAG_21 = dict(
    markt_peak=55.60,
    markt_ts="14:00",
    markt_charge=4.64,
    markt_price=201.29,
    beobachtet=54.30,
    beobachtet_ts="18:30",
    netz_peak=51.68,
    netz_red=2.61,
    komp_peak=52.47,
    komp_red=1.83,
    komp_rev=0.56,
    markt_rev=0.65,
    komp_frac=87,
    hebung=1.31,
    r14=50.96,
)
TAG_29 = dict(
    preis_max=574.28,
    preis_ts="17:15",
    rest_peak=64.41,
    rest_ts="18:15",
    preis_1815=471,
    markt_left=0.83,
    markt_red=0.37,
    netz_peak=60.82,
    netz_red=3.59,
    netz_fenster="16:45–19:00",
    markt_rev=2.11,
    share=10,
    spread=345,
)

CAPTION = "national, kein Netzengpass, Vollvoraussicht · Modell"
