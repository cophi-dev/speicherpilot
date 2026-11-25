#!/usr/bin/env python3
"""SpeicherPilot · Auffälligkeit der Woche v1 · drei Fahrweisen je Tag, isolierter Tageshorizont.

Repo-Skript (relative Pfade). Wiederverwendet:
  scripts/national_fleet_nachtlauf.py  -> Datenabruf Energy-Charts (fetch_day_slots, Preise, attach_prices),
                                          solve_day
  artifacts/october-storage-counterfactual-20261107/mip_month.py
      -> Physik (RTE 85 %, eta = sqrt(0,85), SoC 10–90 %, Start = Ende = 50 %, dt 0,25 h)
Lexikografische Endpunkte wie forschung/simulator_rechnung_v1 (solve_lex_price / solve_lex_peak):
  Markt  = max Erlös, danach min Spitze (Erlös-Toleranz 0,5 €)
  Spitze = min Tagesspitze der Restlast, danach max Erlös (Spitzen-Toleranz 0,05 MW)
  Überschuss = Repo-Regel (Laden nur aus max(0, Wind+Sonne−Last), Entladen ≤ Restlast, max Aufnahme, dann min Spitze)
Flotte: EINE Referenzflotte 4,64409022 GW / 8,1524588 GWh (battery-charts, 31.10.2026).
  Im Repo heißt das factor=2 (Zusatzflotte = (k−1)×Basis); repo-×1 = Ist ohne Zusatz = 0.
Aufruf: venv mit highspy  ->  python3 scripts/auffaelligkeit_woche.py [JJJJ-MM-TT [JJJJ-MM-TT]]
Ohne Argumente: Berliner Vortag. Schreibt data/auffaelligkeit-woche/tage/ und eingang/.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import lil_matrix

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "artifacts/october-storage-counterfactual-20261107"))
import national_fleet_nachtlauf as nf  # noqa: E402
from mip_month import DT_H, ETA, RTE  # noqa: E402

HERE = ROOT / "data" / "auffaelligkeit-woche"
BERLIN = ZoneInfo("Europe/Berlin")
P = nf.BASE_POWER_MW
E = nf.BASE_ENERGY_MWH
REPO_FACTOR = 2  # eine Referenzflotte = repo ×2 (Zusatzflotte 1× Basis)
SCHEMA_VERSION = "auffaelligkeit-woche/1"


# ---------- LP/MIP mit Exklusivität (wie MonthStorageMip, scipy.milp/HiGHS) ----------
def solve(R: np.ndarray, prices: np.ndarray, objective: str, *, peak_ub=None, rev_lb=None,
          c_cap=None, d_cap=None, capture_lb=None):
    """objective: 'rev' (max Erlös), 'peak' (min Spitze), 'capture' (max Laden)."""
    T = len(R)
    ic, id_, iz, ie, iM = 0, T, 2 * T, 3 * T, 4 * T + 1
    n = 4 * T + 2
    cost = np.zeros(n)
    if objective == "rev":
        cost[ic:ic + T] = prices * DT_H
        cost[id_:id_ + T] = -prices * DT_H
    elif objective == "peak":
        cost[iM] = 1.0
    elif objective == "capture":
        cost[ic:ic + T] = -DT_H
    lo = np.zeros(n); hi = np.full(n, np.inf)
    hi[ic:ic + T] = P if c_cap is None else np.minimum(P, c_cap)
    hi[id_:id_ + T] = P if d_cap is None else np.minimum(P, np.maximum(0.0, d_cap))
    hi[iz:iz + T] = 1.0
    lo[ie:ie + T + 1] = 0.1 * E; hi[ie:ie + T + 1] = 0.9 * E
    lo[ie] = hi[ie] = lo[ie + T] = hi[ie + T] = 0.5 * E
    lo[iM] = -np.inf; hi[iM] = np.inf if peak_ub is None else peak_ub
    rows = []
    A = lil_matrix((T, n)); 
    for t in range(T):  # e[t+1] - e[t] - eta c dt + d dt/eta = 0
        A[t, ie + t + 1] = 1; A[t, ie + t] = -1; A[t, ic + t] = -ETA * DT_H; A[t, id_ + t] = DT_H / ETA
    rows.append(LinearConstraint(A.tocsr(), 0, 0))
    B = lil_matrix((2 * T, n))
    for t in range(T):  # c <= P z ; d <= P (1-z)
        B[2 * t, ic + t] = 1; B[2 * t, iz + t] = -P
        B[2 * t + 1, id_ + t] = 1; B[2 * t + 1, iz + t] = P
    ub = np.zeros(2 * T); ub[1::2] = P
    rows.append(LinearConstraint(B.tocsr(), -np.inf, ub))
    C = lil_matrix((T, n))
    for t in range(T):  # R + c - d - M <= 0
        C[t, ic + t] = 1; C[t, id_ + t] = -1; C[t, iM] = -1
    rows.append(LinearConstraint(C.tocsr(), -np.inf, -R))
    if rev_lb is not None:
        v = np.zeros(n); v[ic:ic + T] = -prices * DT_H; v[id_:id_ + T] = prices * DT_H
        rows.append(LinearConstraint(v.reshape(1, -1), rev_lb, np.inf))
    if capture_lb is not None:
        v = np.zeros(n); v[ic:ic + T] = DT_H
        rows.append(LinearConstraint(v.reshape(1, -1), capture_lb, np.inf))
    integ = np.zeros(n); integ[iz:iz + T] = 1
    res = milp(cost, constraints=rows, bounds=Bounds(lo, hi), integrality=integ,
               options={"mip_rel_gap": 1e-6, "time_limit": 300})
    if res.x is None:
        raise RuntimeError(f"milp {objective}: {res.message}")
    x = res.x
    return x[ic:ic + T].copy(), x[id_:id_ + T].copy(), x[ie:ie + T + 1].copy()


def de_int(x):
    return f"{x:,.0f}".replace(",", ".")


def de_dec(x, n=1):
    return f"{x:.{n}f}".replace(".", ",")


def revenue(c, d, p):
    return float(np.sum((d - c) * p) * DT_H)


def fahrweise_markt(R, p):
    c1, d1, _ = solve(R, p, "rev")
    r1 = revenue(c1, d1, p)
    return solve(R, p, "peak", rev_lb=r1 - 0.5)


def fahrweise_spitze(R, p):
    c1, d1, _ = solve(R, p, "peak")
    m = float(np.max(R + c1 - d1))
    return solve(R, p, "rev", peak_ub=m + 0.05)


def fahrweise_ueberschuss(R, p, surplus):
    c1, d1, _ = solve(R, p, "capture", c_cap=surplus, d_cap=R)
    cap = float(np.sum(c1) * DT_H)
    if cap <= 1e-6:
        T = len(R); return np.zeros(T), np.zeros(T), np.full(T + 1, 0.5 * E)
    return solve(R, p, "peak", c_cap=surplus, d_cap=R, capture_lb=cap - 1e-3)


# ---------- Kennzahlen + Checks ----------
def metrics(ts, R, p, c, d, e, surplus=None):
    rp = R + c - d
    i0, i1 = int(np.argmax(R)), int(np.argmax(rp))
    geladen = float(np.sum(c) * DT_H); entladen = float(np.sum(d) * DT_H)
    bal = e[1:] - e[:-1] - ETA * c * DT_H + d * DT_H / ETA
    checks = {
        "energiebilanzRestMaxMwh": float(np.max(np.abs(bal))),
        "socStartMwh": float(e[0]), "socEndeMwh": float(e[-1]),
        "socMinAnteil": float(np.min(e) / E), "socMaxAnteil": float(np.max(e) / E),
        "gleichzeitigMaxMw": float(np.max(np.minimum(c, d))),
        "leistungMaxMw": float(max(np.max(c), np.max(d))),
        "rtGrid": (entladen / geladen) if geladen > 1e-6 else None,
    }
    if surplus is not None:
        checks["ladenUeberUeberschussMaxMw"] = float(np.max(c - surplus))
    ok = (checks["energiebilanzRestMaxMwh"] < 1e-4 and abs(e[0] - 0.5 * E) < 1e-3 and abs(e[-1] - 0.5 * E) < 1e-3
          and checks["socMinAnteil"] >= 0.1 - 1e-6 and checks["socMaxAnteil"] <= 0.9 + 1e-6
          and checks["gleichzeitigMaxMw"] < 1e-3 and checks["leistungMaxMw"] <= P + 1e-3
          and (geladen < 1e-6 or abs(checks["rtGrid"] - RTE) < 1e-4))
    checks["ok"] = bool(ok)
    return {
        "erloesEur": round(revenue(c, d, p), 2),
        "spitzeVorherGw": round(float(R[i0]) / 1e3, 4), "spitzeVorherUhrzeit": ts[i0][11:16],
        "spitzeNachherGw": round(float(rp[i1]) / 1e3, 4), "spitzeNachherUhrzeit": ts[i1][11:16],
        "senkungGw": round(float(R[i0] - rp[i1]) / 1e3, 4),
        "geladenMwh": round(geladen, 1), "entladenMwh": round(entladen, 1),
        "roundTripVerlustMwh": round(geladen - entladen, 1),
        "durchsatzMwh": round(entladen, 1),
        "vollzyklen": round(entladen / E, 3),
        "checks": checks,
        "_series": {"c_mw": c, "d_mw": d, "e_mwh": e, "r_prime_mw": rp},
    }


def load_slots(day: str) -> tuple[list[dict], dict]:
    """Frisch von Energy-Charts (wie Nachtlauf) und Abgleich gegen Repo-_inputs.json."""
    slots = nf.fetch_day_slots(day)
    matched, total = nf.attach_prices(slots, nf.fetch_day_ahead_prices(day))
    (HERE / "eingang" / f"{day}.json").write_text(json.dumps({"dateBerlin": day, "abgerufen": datetime.now(BERLIN).isoformat(timespec="seconds"), "slots": slots}, ensure_ascii=False))
    repo = nf.read_day_inputs(day)
    diff = None
    if repo:
        rr = np.array([s["residual_mw"] for s in repo]); rn = np.array([s["residual_mw"] for s in slots])
        pr = np.array([s["day_ahead_eur_mwh"] for s in repo]); pn = np.array([s["day_ahead_eur_mwh"] for s in slots])
        diff = {"repoInputsVorhanden": True, "restlastMaxAbwMw": float(np.max(np.abs(rr - rn))) if len(rr) == len(rn) else None,
                "preisMaxAbwEurMwh": float(np.nanmax(np.abs(pr - pn))) if len(pr) == len(pn) else None}
    else:
        diff = {"repoInputsVorhanden": False}
    return slots, {"preiseGefunden": matched, "viertelstunden": total, "abgleichRepo": diff}


def repo_tag_dispatch(slots):
    """Was /tag Kapitel 03 heute zeigt (repo solve_day, factor 2): Spitze = lex min Spitze, dann min Laden + Glättung."""
    out = {}
    R = np.array([s["residual_mw"] for s in slots]); p = np.array([s["day_ahead_eur_mwh"] for s in slots])
    for strat in nf.STRATEGIES:
        c, d, e = nf.solve_day(slots, REPO_FACTOR, strat)
        rp = R + c - d
        out[nf.STRATEGY_UI[strat]] = {"erloesEur": round(revenue(c, d, p), 2),
                                      "senkungGw": round(float(R.max() - rp.max()) / 1e3, 4),
                                      "geladenMwh": round(float(c.sum() * DT_H), 1)}
    return out


def rechne_tag(day: str) -> dict:
    t0 = time.perf_counter()
    slots, quelle = load_slots(day)
    ts = [s["timestamp_berlin"] for s in slots]
    R = np.array([s["residual_mw"] for s in slots]); p = np.array([s["day_ahead_eur_mwh"] for s in slots])
    sur = np.array([s["surplus_mw"] for s in slots])
    if not nf.market_prices_ok(slots):
        raise RuntimeError(f"{day}: Preise unvollständig")
    fw = {
        "markt": metrics(ts, R, p, *fahrweise_markt(R, p)),
        "ueberschuss": metrics(ts, R, p, *fahrweise_ueberschuss(R, p, sur), surplus=sur),
        "spitze": metrics(ts, R, p, *fahrweise_spitze(R, p)),
    }
    m, s = fw["markt"], fw["spitze"]
    diff_eur = s["erloesEur"] - m["erloesEur"]
    pct = 100 * diff_eur / m["erloesEur"] if m["erloesEur"] else 0.0
    plaus = {
        "alleChecksOk": all(v["checks"]["ok"] for v in fw.values()),
        "spitzeGesenkt": s["senkungGw"] > 0,
        "spitzeNichtSchlechterAlsMarkt": s["spitzeNachherGw"] <= m["spitzeNachherGw"] + 1e-4,
        "marktErloesMax": m["erloesEur"] >= s["erloesEur"] - 0.5 and m["erloesEur"] >= fw["ueberschuss"]["erloesEur"] - 0.5,
    }
    repo = repo_tag_dispatch(slots)
    series = {k: {kk: [round(float(x), 2) for x in vv] for kk, vv in v.pop("_series").items()} for k, v in fw.items()}
    doc = {
        "schema": SCHEMA_VERSION,
        "dateBerlin": day,
        "berechnetAm": datetime.now(BERLIN).isoformat(timespec="seconds"),
        "datenstand": {"quelle": "Energy-Charts (Fraunhofer ISE), Last inkl. Eigenverbrauch, Wind on/offshore, Solar; Day-Ahead DE-LU", "lizenz": "CC BY 4.0", **quelle},
        "annahmen": {
            "flotte": {"leistungMw": P, "energieMwh": E, "labelDe": "Referenzflotte ×1 (4,64 GW / 8,15 GWh)", "repoFaktor": REPO_FACTOR,
                       "hinweis": "Repo-Konvention: Zusatzflotte (k−1)×Basis; diese Rechnung = eine Referenzflotte = /tag ?faktor=2. /tag ×1 zeigt den Ist ohne Zusatzflotte (0)."},
            "horizont": "isolierter Tageshorizont, SoC Start = Ende = 50 %", "socGrenzen": [0.1, 0.9], "roundTrip": RTE,
            "preisnehmer": True, "markt": "Day-Ahead DE-LU, Viertelstunde", "voraussicht": "vollständig (alle drei Fahrweisen)",
            "restlast": "Last inkl. Eigenverbrauch minus Wind (on+off) minus Solar, national",
            "euro": "Modellschätzung, nur ×1, nicht hochrechnen; keine CAPEX, kein Intraday, keine Regelleistung",
        },
        "spitzeVorherGw": round(float(R.max()) / 1e3, 4),
        "spitzeVorherUhrzeit": ts[int(np.argmax(R))][11:16],
        "ueberschussMwh": round(float(sur.sum() * DT_H), 1),
        "preisMinMax": [round(float(p.min()), 2), round(float(p.max()), 2)],
        "fahrweisen": fw,
        "vergleich": {
            "spitzeMinusMarktEur": round(diff_eur, 2),
            "spitzeMinusMarktProzent": round(100 * diff_eur / m["erloesEur"], 2) if m["erloesEur"] else None,
            "senkungSpitzeMinusMarktGw": round(s["senkungGw"] - m["senkungGw"], 4),
            "grenzeDe": ("Untergrenze des Modellverlusts: Die Spitzen-Fahrweise kennt Höhe und Zeitpunkt der Abendspitze voraus. "
                         f"Real ohne diese Voraussicht kostet die Spitzenkappung mindestens {de_int(abs(diff_eur))} € ({de_dec(abs(pct), 1)} %, Modellschätzung) "
                         "gegenüber dem Markt-Fahrplan, eher mehr (Reserve-SoC, Prognosefehler)."),
        },
        "plausibilitaet": plaus,
        "tagSeiteHeute": {"hinweis": "Dispatch, den /tag Kapitel 03 aus data/national-fleet/…/days/ zeigt (repo solve_day, factor 2). Spitze dort: min Spitze, dann min Laden + Glättung, NICHT max Erlös.", **repo},
        "zeitreihe": {"timestampBerlin": ts, "restlastMw": [round(float(x), 1) for x in R],
                      "dayAheadEurMwh": [round(float(x), 2) for x in p], "ueberschussMw": [round(float(x), 1) for x in sur], **series},
        "laufzeitS": round(time.perf_counter() - t0, 2),
    }
    return doc


def berlin_yesterday() -> date:
    return datetime.now(BERLIN).date() - timedelta(days=1)


def main(argv):
    if len(argv) < 2:
        a = b = berlin_yesterday()
    else:
        a, b = date.fromisoformat(argv[1]), date.fromisoformat(argv[2] if len(argv) > 2 else argv[1])
    (HERE / "tage").mkdir(parents=True, exist_ok=True)
    (HERE / "eingang").mkdir(parents=True, exist_ok=True)
    out = []
    d = a
    while d <= b:
        doc = rechne_tag(d.isoformat())
        (HERE / "tage" / f"{d.isoformat()}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1))
        f = doc["fahrweisen"]
        print(d, "peak", doc["spitzeVorherGw"], {k: (v["erloesEur"], v["senkungGw"]) for k, v in f.items()}, doc["vergleich"]["spitzeMinusMarktProzent"], doc["plausibilitaet"], flush=True)
        out.append(doc); d += timedelta(days=1); time.sleep(1.0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
