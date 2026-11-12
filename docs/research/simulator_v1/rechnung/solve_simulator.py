#!/usr/bin/env python3
"""SpeicherPilot · Simulator-Rechnung v1 · Pareto, fNAV, Tagesklassen.

Nur rechnen und dokumentieren. Kein Repo-Commit, kein PR.

Löser: HiGHS über scipy.optimize.linprog (LP, ohne Binärvariablen).
Physik wie MonthStorageMip (artifacts/october-storage-counterfactual-20261107/mip_month.py):
  Round-Trip 85 %, η = √0,85, SoC 10–90 %, Start = Ende = 50 %,
  e[t+1] = e[t] + η·c·dt − d·dt/η, Restlast' = R + c − d,
  Preisnehmer, Vollvoraussicht, Day-Ahead DE-LU Viertelstunden.

Gleichzeitiges Laden und Entladen ist bei RTE < 1 nie optimal (Nachprüfung
pro Lauf). Deshalb ist das LP äquivalent zum MIP mit Exklusivitäts-Binärvariablen.

Zählung (a): ×1 = 0 zusätzlich (beobachteter Ist); ×k = (k−1) × 4,64409022 GW
/ 8,1524588 GWh (battery-charts Großspeicher, Stand 31.10.2026).

Zielfunktion Kompromiss: max. Erlös − λ · Monatsspitze.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_matrix, csr_matrix

ROOT = Path(__file__).resolve().parent
INPUT_CSV = ROOT / "beobachtungen-viertelstunden-202610-berlin.csv"
BERLIN = ZoneInfo("Europe/Berlin")

# battery-charts Großspeicher, Monatswert 31.10.2026 (fleetBasis.ts / nachrechnung v3)
FLEET_POWER_MW = 4_644.09022
FLEET_ENERGY_MWH = 8_152.4588
RTE = 0.85
ETA = math.sqrt(RTE)
DT_H = 0.25

# PR #99 / nachrechnung v3 Referenzwerte (Konvention a, 1,755 h)
REF_PEAK_MW = 64_405.9
REF_X10_NETZ_GW = 50.43  # 64,4059 − 13,9795 ≈ 50,426
REF_X10_NETZ_SENKUNG_GW = 13.979487077758503
REF_X5_NETZ_SENKUNG_GW = 9.411100317117969
REF_X2_NETZ_SENKUNG_GW = 3.590362603339905
REF_X10_MARKT_GW = 92.72  # zu prüfen

# fNAV stilisiert: Entnahmeverbot 16:00–21:00 Europe/Berlin (statisches Zeitfenster)
FNAV_CHARGE_FORBID_START_MIN = 16 * 60
FNAV_CHARGE_FORBID_END_MIN = 21 * 60

# Tagesklassen-Schwellen (vorab festgelegt, nicht nach dem Lauf angepasst)
WINWIN_SENKUNG_ANTEIL = 0.70
KONFLIKT_SENKUNG_ANTEIL = 0.30
MIN_NETZ_SENKUNG_GW = 0.10  # unterhalb: „wenig zu kappen“
PEAK_RAISE_TOL_GW = 0.01  # numerische Toleranz: Hebung
HIGH_REVENUE_FRAC_OF_MAXDAY = 0.50  # „Markt-Erlös hoch“

SOLVE_TOL = dict(time_limit=180.0, presolve=True, disp=False)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@dataclass
class Interval:
    ts: str
    day: str
    minute_of_day: int
    residual_mw: float
    price_eur_mwh: float
    load_mw: float
    wind_solar_mw: float
    surplus_mw: float


@dataclass
class SolveResult:
    name: str
    factor: int
    power_mw: float
    energy_mwh: float
    mode: str
    lam_eur_per_mw: float | None
    status: str
    runtime_s: float
    revenue_eur: float
    peak_mw: float
    peak_ts: str
    baseline_peak_mw: float
    baseline_peak_ts: str
    reduction_mw: float
    charge_mwh: float
    discharge_mwh: float
    rte_grid: float
    energy_balance_residue_mwh: float
    soc_start_mwh: float
    soc_end_mwh: float
    soc_min_mwh: float
    soc_max_mwh: float
    simultaneous_max_mw: float
    power_violation_mw: float
    notes: str = ""
    # dispatch arrays stored separately


def load_intervals(path: Path = INPUT_CSV) -> list[Interval]:
    out: list[Interval] = []
    with path.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            ts = r["timestamp_berlin"]
            # already Berlin local with offset
            day = ts[:10]
            hh = int(ts[11:13])
            mm = int(ts[14:16])
            load = float(r["load_incl_self_consumption_mw"])
            ws = float(r["wind_solar_mw"])
            res = float(r["residual_wind_solar_mw"])
            if abs((load - ws) - res) > 0.05:
                raise ValueError(f"residual mismatch at {ts}: {load}-{ws}!={res}")
            out.append(
                Interval(
                    ts=ts,
                    day=day,
                    minute_of_day=hh * 60 + mm,
                    residual_mw=res,
                    price_eur_mwh=float(r["day_ahead_eur_mwh"]),
                    load_mw=load,
                    wind_solar_mw=ws,
                    surplus_mw=max(0.0, ws - load),
                )
            )
    if len(out) != 2980:
        raise ValueError(f"expected 2980 intervals, got {len(out)}")
    return out


def additional_fleet(factor: int) -> tuple[float, float]:
    add = max(0, factor - 1)
    return add * FLEET_POWER_MW, add * FLEET_ENERGY_MWH


def _fnav_charge_cap(intervals: list[Interval], p_mw: float) -> np.ndarray:
    cap = np.full(len(intervals), p_mw, dtype=float)
    for i, it in enumerate(intervals):
        if FNAV_CHARGE_FORBID_START_MIN <= it.minute_of_day < FNAV_CHARGE_FORBID_END_MIN:
            cap[i] = 0.0
    return cap


class MonthLP:
    """Ein einmal gebautes LP, Ziele und Schranken werden je Lauf geändert."""

    def __init__(
        self,
        residual: np.ndarray,
        prices: np.ndarray,
        p_mw: float,
        e_nom: float,
        charge_cap: np.ndarray | None = None,
        discharge_cap: np.ndarray | None = None,
    ) -> None:
        self.R = np.asarray(residual, dtype=float)
        self.prices = np.asarray(prices, dtype=float)
        self.P = float(p_mw)
        self.E = float(e_nom)
        self.T = len(self.R)
        T = self.T
        # Variablen: c[0:T], d[0:T], s[0:T+1], M
        self.ic = 0
        self.id = T
        self.ie = 2 * T
        self.iM = 3 * T + 1
        self.n = 3 * T + 2
        self.charge_cap = charge_cap if charge_cap is not None else np.full(T, p_mw)
        self.discharge_cap = discharge_cap if discharge_cap is not None else np.full(T, p_mw)

        # Gleichungen SoC: s[t+1] - s[t] - η·dt·c[t] + (dt/η)·d[t] = 0, t=0..T-1
        rows, cols, data = [], [], []
        for t in range(T):
            rows += [t, t, t, t]
            cols += [self.ie + t + 1, self.ie + t, self.ic + t, self.id + t]
            data += [1.0, -1.0, -ETA * DT_H, DT_H / ETA]
        self.Aeq = csr_matrix((data, (rows, cols)), shape=(T, self.n))
        self.beq = np.zeros(T)

        # Ungleichungen: R[t] + c[t] - d[t] - M <= 0
        rows, cols, data = [], [], []
        for t in range(T):
            rows += [t, t, t]
            cols += [self.ic + t, self.id + t, self.iM]
            data += [1.0, -1.0, -1.0]
        self.Aub_peak = csr_matrix((data, (rows, cols)), shape=(T, self.n))
        self.bub_peak = -self.R

        self.e_min = 0.1 * self.E if self.E > 0 else 0.0
        self.e_max = 0.9 * self.E if self.E > 0 else 0.0
        self.e_start = 0.5 * self.E

    def _bounds(self, peak_ub: float | None = None) -> list[tuple[float | None, float | None]]:
        T = self.T
        b: list[tuple[float | None, float | None]] = []
        for t in range(T):
            b.append((0.0, float(self.charge_cap[t])))
        for t in range(T):
            b.append((0.0, float(self.discharge_cap[t])))
        for t in range(T + 1):
            if t == 0 or t == T:
                b.append((self.e_start, self.e_start))
            else:
                b.append((self.e_min, self.e_max))
        # M
        lo_m = float(np.min(self.R) - self.P - 1.0)
        hi_m = float(np.max(self.R) + self.P + 1.0) if peak_ub is None else float(peak_ub)
        b.append((lo_m, hi_m))
        return b

    def solve(
        self,
        sense: str,
        lam_eur_per_mw: float = 0.0,
        peak_ub: float | None = None,
        revenue_lb_eur: float | None = None,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, float, dict]:
        """sense: 'price' | 'peak' | 'weighted' | 'price_then_keep'.

        cost is always minimized.
        price:  min  Σ p·(c−d)·dt          (= max Erlös)
        peak:   min  M  (+ winzige Durchsatzstrafe nur wenn explizit)
        weighted: min  −Erlös + λ·M  = min Σ p·(c−d)·dt + λ·M
        """
        if self.P <= 0 or self.E <= 0:
            zc = np.zeros(self.T)
            zd = np.zeros(self.T)
            ze = np.full(self.T + 1, 0.0)
            M = float(np.max(self.R))
            return zc, zd, ze, M, dict(status="trivial_zero_fleet", runtime_s=0.0, success=True, message="P=0")

        T = self.T
        cost = np.zeros(self.n)
        priced = self.prices * DT_H  # EUR per MW of charge (or −discharge)
        if sense in ("price", "weighted", "price_capped"):
            cost[self.ic : self.ic + T] = priced
            cost[self.id : self.id + T] = -priced
            if sense == "weighted":
                cost[self.iM] = lam_eur_per_mw
        elif sense == "peak":
            cost[self.iM] = 1.0
        else:
            raise ValueError(sense)

        Aub = self.Aub_peak
        bub = self.bub_peak
        Aeq = self.Aeq
        beq = self.beq

        if revenue_lb_eur is not None:
            # Erlös = Σ p·(d−c)·dt  >= revenue_lb  ⇒  Σ p·(c−d)·dt  <= −revenue_lb
            from scipy.sparse import vstack

            row_r = np.zeros(self.n)
            row_r[self.ic : self.ic + T] = priced
            row_r[self.id : self.id + T] = -priced
            Aub = vstack([self.Aub_peak, csr_matrix(row_r.reshape(1, -1))])
            bub = np.concatenate([self.bub_peak, np.array([-revenue_lb_eur])])

        bounds = self._bounds(peak_ub=peak_ub)
        t0 = time.perf_counter()
        res = linprog(
            cost,
            A_ub=Aub,
            b_ub=bub,
            A_eq=Aeq,
            b_eq=beq,
            bounds=bounds,
            method="highs",
            options=SOLVE_TOL,
        )
        rt = time.perf_counter() - t0
        if not res.success:
            raise RuntimeError(f"HiGHS failed ({sense}, λ={lam_eur_per_mw}): {res.message}")
        x = res.x
        c = x[self.ic : self.ic + T].copy()
        d = x[self.id : self.id + T].copy()
        e = x[self.ie : self.ie + T + 1].copy()
        M = float(x[self.iM])
        info = dict(
            status=str(res.message),
            runtime_s=rt,
            success=bool(res.success),
            nit=int(getattr(res, "nit", 0) or 0),
            fun=float(res.fun) if res.fun is not None else None,
        )
        return c, d, e, M, info


def evaluate(
    name: str,
    factor: int,
    intervals: list[Interval],
    c: np.ndarray,
    d: np.ndarray,
    e: np.ndarray,
    p_mw: float,
    e_nom: float,
    mode: str,
    lam: float | None,
    info: dict,
    notes: str = "",
) -> SolveResult:
    R = np.array([it.residual_mw for it in intervals])
    prices = np.array([it.price_eur_mwh for it in intervals])
    rp = R + c - d
    revenue = float(np.sum(prices * (d - c) * DT_H))
    i_b = int(np.argmax(R))
    i_a = int(np.argmax(rp))
    charge = float(np.sum(c) * DT_H)
    discharge = float(np.sum(d) * DT_H)
    residue = float(np.sum(ETA * c * DT_H - d * DT_H / ETA) + (e[-1] - e[0]))
    # physical SoC balance: e_end - e_start = η Σ c dt − Σ d dt / η
    soc_balance = float((e[-1] - e[0]) - (np.sum(ETA * c * DT_H - d * DT_H / ETA)))
    rte = discharge / charge if charge > 1e-9 else (1.0 if discharge < 1e-9 else float("nan"))
    return SolveResult(
        name=name,
        factor=factor,
        power_mw=p_mw,
        energy_mwh=e_nom,
        mode=mode,
        lam_eur_per_mw=lam,
        status=info.get("status", ""),
        runtime_s=float(info.get("runtime_s", 0.0)),
        revenue_eur=revenue,
        peak_mw=float(np.max(rp)),
        peak_ts=intervals[i_a].ts,
        baseline_peak_mw=float(np.max(R)),
        baseline_peak_ts=intervals[i_b].ts,
        reduction_mw=float(np.max(R) - np.max(rp)),
        charge_mwh=charge,
        discharge_mwh=discharge,
        rte_grid=float(rte),
        energy_balance_residue_mwh=soc_balance,
        soc_start_mwh=float(e[0]),
        soc_end_mwh=float(e[-1]),
        soc_min_mwh=float(np.min(e)),
        soc_max_mwh=float(np.max(e)),
        simultaneous_max_mw=float(np.max(np.minimum(c, d))) if len(c) else 0.0,
        power_violation_mw=float(max(np.max(c) - p_mw if len(c) else 0.0, np.max(d) - p_mw if len(d) else 0.0, 0.0)),
        notes=notes,
    )


def solve_mode(
    intervals: list[Interval],
    factor: int,
    mode: str,
    lam: float = 0.0,
    fnav: bool = False,
    peak_ub: float | None = None,
    revenue_lb: float | None = None,
    name: str | None = None,
) -> tuple[SolveResult, np.ndarray, np.ndarray, np.ndarray]:
    p, e_nom = additional_fleet(factor)
    R = np.array([it.residual_mw for it in intervals])
    prices = np.array([it.price_eur_mwh for it in intervals])
    charge_cap = _fnav_charge_cap(intervals, p) if fnav else None
    lp = MonthLP(R, prices, p, e_nom, charge_cap=charge_cap)
    if mode == "price":
        c, d, e, M, info = lp.solve("price", peak_ub=peak_ub, revenue_lb_eur=revenue_lb)
    elif mode == "peak":
        c, d, e, M, info = lp.solve("peak", peak_ub=peak_ub, revenue_lb_eur=revenue_lb)
    elif mode == "weighted":
        c, d, e, M, info = lp.solve("weighted", lam_eur_per_mw=lam, peak_ub=peak_ub, revenue_lb_eur=revenue_lb)
    else:
        raise ValueError(mode)
    res = evaluate(
        name or f"x{factor}_{mode}_lam{lam}",
        factor,
        intervals,
        c,
        d,
        e,
        p,
        e_nom,
        mode,
        lam if mode == "weighted" else (0.0 if mode == "price" else None),
        info,
        notes=("fNAV Entnahmeverbot 16–21 Uhr" if fnav else ""),
    )
    return res, c, d, e


def solve_lex_price(intervals, factor, fnav=False):
    """Max. Erlös, danach unter diesem Erlös die Spitze minimieren."""
    r1, c1, d1, e1 = solve_mode(intervals, factor, "price", fnav=fnav, name=f"x{factor}_price")
    # 0,5 € Toleranz, dann min Peak
    r2, c2, d2, e2 = solve_mode(
        intervals,
        factor,
        "peak",
        fnav=fnav,
        revenue_lb=r1.revenue_eur - 0.5,
        name=f"x{factor}_price_lexpeak",
    )
    # revenue should stay ~r1; take r2 as the lex point
    r2.mode = "price_lex"
    r2.lam_eur_per_mw = 0.0
    r2.notes = (r2.notes + "; " if r2.notes else "") + (
        f"lex: max Erlös ({r1.revenue_eur:.2f} €), dann min Spitze; "
        f"Erlös danach {r2.revenue_eur:.2f} €, Δ={r2.revenue_eur-r1.revenue_eur:.2f}"
    )
    r2.runtime_s = r1.runtime_s + r2.runtime_s
    return r2, c2, d2, e2, r1


def solve_lex_peak(intervals, factor, fnav=False):
    """Min. Spitze, danach unter dieser Spitze den Erlös maximieren."""
    r1, c1, d1, e1 = solve_mode(intervals, factor, "peak", fnav=fnav, name=f"x{factor}_peak")
    r2, c2, d2, e2 = solve_mode(
        intervals,
        factor,
        "price",
        fnav=fnav,
        peak_ub=r1.peak_mw + 0.05,  # 0,05 MW Toleranz
        name=f"x{factor}_peak_lexprice",
    )
    r2.mode = "peak_lex"
    r2.lam_eur_per_mw = None
    r2.notes = (r2.notes + "; " if r2.notes else "") + (
        f"lex: min Spitze ({r1.peak_mw:.4f} MW), dann max Erlös; "
        f"Spitze danach {r2.peak_mw:.4f}, Erlös {r2.revenue_eur:.2f} € "
        f"(ohne Lex-Erlös wäre {r1.revenue_eur:.2f} €)"
    )
    r2.runtime_s = r1.runtime_s + r2.runtime_s
    return r2, c2, d2, e2, r1


def result_to_dict(r: SolveResult) -> dict:
    d = asdict(r)
    d["revenue_mio_eur"] = r.revenue_eur / 1e6
    d["peak_gw"] = r.peak_mw / 1e3
    d["reduction_gw"] = r.reduction_mw / 1e3
    d["baseline_peak_gw"] = r.baseline_peak_mw / 1e3
    return d


def save_dispatch(path: Path, intervals, c, d, e, result: SolveResult) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(
            [
                "timestamp_berlin",
                "c_mw",
                "d_mw",
                "soc_mwh",
                "residual_mw",
                "residual_prime_mw",
                "day_ahead_eur_mwh",
                "name",
                "factor",
                "mode",
            ]
        )
        for i, it in enumerate(intervals):
            w.writerow(
                [
                    it.ts,
                    f"{c[i]:.6f}",
                    f"{d[i]:.6f}",
                    f"{e[i]:.6f}",
                    f"{it.residual_mw:.4f}",
                    f"{it.residual_mw + c[i] - d[i]:.6f}",
                    f"{it.price_eur_mwh:.4f}",
                    result.name,
                    result.factor,
                    result.mode,
                ]
            )


def lam_sweep_grid(rev_mkt: float, rev_net: float, peak_mkt: float, peak_net: float, n: int = 15) -> list[float]:
    """λ-Raster um den mittleren Steigungspreis, log-verteilt, plus enger um die Mitte."""
    dpeak = max(peak_mkt - peak_net, 1e-6)  # MW
    drev = max(rev_mkt - rev_net, 1.0)  # EUR
    lam_mid = drev / dpeak  # EUR/MW
    # 15 Punkte: 10^{−2,5} … 10^{2,5} × λ_mid
    exponents = np.linspace(-2.5, 2.5, n)
    lams = sorted(set(float(lam_mid * 10**ex) for ex in exponents))
    return lams, lam_mid


def dichotomy_front(intervals, factor, mkt: SolveResult, net: SolveResult, max_points: int = 20) -> list[tuple[float, SolveResult, np.ndarray, np.ndarray, np.ndarray]]:
    """Finde Extrempunkte der konvexen Front durch dichotomes λ."""
    found: list[tuple[float, SolveResult, np.ndarray, np.ndarray, np.ndarray]] = []

    def run(lam: float):
        r, c, d, e = solve_mode(intervals, factor, "weighted", lam=lam, name=f"x{factor}_lam{lam:.6g}")
        return r, c, d, e

    def rec(a: SolveResult, b: SolveResult, depth: int):
        if len(found) >= max_points or depth > 12:
            return
        dpeak = a.peak_mw - b.peak_mw
        drev = a.revenue_eur - b.revenue_eur
        if dpeak < 0.5:  # < 0,5 MW: praktisch gleicher Punkt
            return
        if drev < 1.0:
            return
        lam = drev / dpeak
        r, c, d, e = run(lam)
        # Verbesserung über die Sehne?
        val_line = a.revenue_eur - lam * a.peak_mw
        val_c = r.revenue_eur - lam * r.peak_mw
        # Abstand zu a, b
        far_a = abs(r.peak_mw - a.peak_mw) > 1.0 and abs(r.revenue_eur - a.revenue_eur) > 50.0
        far_b = abs(r.peak_mw - b.peak_mw) > 1.0 and abs(r.revenue_eur - b.revenue_eur) > 50.0
        if val_c > val_line + 10.0 and far_a and far_b:
            found.append((lam, r, c, d, e))
            rec(a, r, depth + 1)
            rec(r, b, depth + 1)

    rec(mkt, net, 0)
    found.sort(key=lambda x: -x[1].revenue_eur)
    return found


def daily_indices(intervals: list[Interval]) -> dict[str, list[int]]:
    by: dict[str, list[int]] = {}
    for i, it in enumerate(intervals):
        by.setdefault(it.day, []).append(i)
    return by


def slice_day(intervals, idxs) -> list[Interval]:
    return [intervals[i] for i in idxs]


def classify_day(delta_m_gw: float, delta_n_gw: float, rev_m: float, max_day_rev: float) -> str:
    """Zitierbare Regel, siehe ergebnis.md / Regel T.

    1. Konflikt-Hebung: Erlös-Fahrplan hebt die Tagesspitze um mehr als 0,01 GW.
    2. Konflikt-schwach: netzdienliche Senkung ≥ 0,10 GW, Marktsenkung < 30 % davon
       und Markt-Erlös ≥ 50 % des höchsten Tageserlöses im Monat.
    3. Win-win: netzdienliche Senkung ≥ 0,10 GW und Marktsenkung ≥ 70 % davon.
       (Erlös-Fahrplan erreicht per Konstruktion 100 % des maximalen Tageserlöses.)
    4. Neutral: sonst (wenig zu kappen, oder Senkung zwischen 30 und 70 %).
    """
    if delta_m_gw < -PEAK_RAISE_TOL_GW:
        return "konflikt_hebung"
    if delta_n_gw >= MIN_NETZ_SENKUNG_GW and delta_m_gw < KONFLIKT_SENKUNG_ANTEIL * delta_n_gw:
        if rev_m >= HIGH_REVENUE_FRAC_OF_MAXDAY * max_day_rev:
            return "konflikt_schwach"
        return "neutral"
    if delta_n_gw >= MIN_NETZ_SENKUNG_GW and delta_m_gw >= WINWIN_SENKUNG_ANTEIL * delta_n_gw:
        return "win_win"
    return "neutral"


def main_endpoints_and_sweep(intervals, factors=(2, 5, 10)) -> dict:
    out: dict = {"factors": {}, "generated_at": datetime.now(BERLIN).isoformat()}
    for factor in factors:
        print(f"\n===== ×{factor}  P={additional_fleet(factor)[0]:.4f} MW  E={additional_fleet(factor)[1]:.4f} MWh =====", flush=True)
        pack: dict = {"points": [], "dispatches": {}}

        print("  lex price …", flush=True)
        mkt, c_m, d_m, e_m, mkt_raw = solve_lex_price(intervals, factor)
        print(
            f"    Markt lex: Erlös {mkt.revenue_eur/1e6:.4f} Mio €, Spitze {mkt.peak_mw/1e3:.4f} GW, "
            f"Senkung {mkt.reduction_mw/1e3:.4f} GW, t={mkt.runtime_s:.1f}s",
            flush=True,
        )
        print("  lex peak …", flush=True)
        net, c_n, d_n, e_n, net_raw = solve_lex_peak(intervals, factor)
        print(
            f"    Netz lex: Erlös {net.revenue_eur/1e6:.4f} Mio €, Spitze {net.peak_mw/1e3:.4f} GW, "
            f"Senkung {net.reduction_mw/1e3:.4f} GW, t={net.runtime_s:.1f}s",
            flush=True,
        )

        pack["market_lex"] = result_to_dict(mkt)
        pack["market_raw"] = result_to_dict(mkt_raw)
        pack["netz_lex"] = result_to_dict(net)
        pack["netz_raw"] = result_to_dict(net_raw)

        save_dispatch(ROOT / "dispatch" / f"x{factor}_price_lex.csv", intervals, c_m, d_m, e_m, mkt)
        save_dispatch(ROOT / "dispatch" / f"x{factor}_peak_lex.csv", intervals, c_n, d_n, e_n, net)

        # λ-Raster
        lams, lam_mid = lam_sweep_grid(mkt.revenue_eur, net.revenue_eur, mkt.peak_mw, net.peak_mw, n=15)
        pack["lam_mid_eur_per_mw"] = lam_mid
        pack["lam_grid"] = lams
        print(f"  λ_mid = {lam_mid:.4f} €/MW  ({lam_mid*1000:.1f} €/kW bzw. {lam_mid*1e6:.0f} €/GW)", flush=True)

        grid_pts = []
        for i, lam in enumerate(lams):
            print(f"  λ-grid [{i+1}/{len(lams)}] λ={lam:.6g} …", flush=True)
            r, c, d, e = solve_mode(intervals, factor, "weighted", lam=lam, name=f"x{factor}_grid_lam{lam:.6g}")
            print(
                f"    Erlös {r.revenue_eur/1e6:.4f} Mio, Senkung {r.reduction_mw/1e3:.4f} GW, t={r.runtime_s:.1f}s",
                flush=True,
            )
            grid_pts.append(result_to_dict(r))
            if factor == 2 and i in (0, 7, 14):
                save_dispatch(ROOT / "dispatch" / f"x2_grid_{i}_lam{lam:.4g}.csv", intervals, c, d, e, r)
        pack["grid_points"] = grid_pts

        # Dichotomie
        print("  Dichotomie …", flush=True)
        extra = dichotomy_front(intervals, factor, mkt, net)
        pack["dichotomy_points"] = []
        for lam, r, c, d, e in extra:
            print(
                f"    λ={lam:.6g}: Erlös {r.revenue_eur/1e6:.4f}, Senkung {r.reduction_mw/1e3:.4f}",
                flush=True,
            )
            pack["dichotomy_points"].append(result_to_dict(r))
            if factor == 2:
                save_dispatch(ROOT / "dispatch" / f"x2_dich_lam{lam:.4g}.csv", intervals, c, d, e, r)

        # Exakter 70-%-Schnitt: max Erlös s.t. Senkung ≥ 70 % der max. Senkung
        red_max = net.reduction_mw
        peak_70 = mkt.baseline_peak_mw - 0.70 * red_max
        print(f"  ε-Schnitt 70 % Senkung (Peak-UB {peak_70/1e3:.4f} GW) …", flush=True)
        r70, c70, d70, e70 = solve_mode(
            intervals, factor, "price", peak_ub=peak_70 + 0.05, name=f"x{factor}_eps70"
        )
        pack["eps70"] = result_to_dict(r70)
        print(
            f"    Erlös {r70.revenue_eur/1e6:.4f} ({100*r70.revenue_eur/mkt.revenue_eur:.1f} % vom Markt), "
            f"Senkung {r70.reduction_mw/1e3:.4f} GW",
            flush=True,
        )
        if factor == 2:
            save_dispatch(ROOT / "dispatch" / "x2_eps70.csv", intervals, c70, d70, e70, r70)

        # ebenso 50 % und 90 % zur Form der Front
        for frac in (0.50, 0.90):
            pub = mkt.baseline_peak_mw - frac * red_max
            rf, _, _, _ = solve_mode(intervals, factor, "price", peak_ub=pub + 0.05, name=f"x{factor}_eps{int(frac*100)}")
            pack[f"eps{int(frac*100)}"] = result_to_dict(rf)
            print(
                f"  ε-{int(frac*100)} %: Erlös {rf.revenue_eur/1e6:.4f} ({100*rf.revenue_eur/mkt.revenue_eur:.1f} %), "
                f"Senkung {rf.reduction_mw/1e3:.4f}",
                flush=True,
            )

        # fNAV
        print("  fNAV (Entnahmeverbot 16–21, max. Erlös, lex min Peak) …", flush=True)
        fn, c_f, d_f, e_f, fn_raw = solve_lex_price(intervals, factor, fnav=True)
        fn.mode = "fnav_price_lex"
        fn.notes = (
            "fNAV stilisiert §17 Abs. 2b: statisches Entnahmeverbot (Laden=0) "
            "täglich 16:00–21:00 Europe/Berlin; Einspeisung unbeschränkt; danach lex min Spitze. "
            "National, kein örtlicher Anschlussvertrag."
        )
        pack["fnav_lex"] = result_to_dict(fn)
        pack["fnav_raw"] = result_to_dict(fn_raw)
        print(
            f"    fNAV: Erlös {fn.revenue_eur/1e6:.4f} ({100*fn.revenue_eur/mkt.revenue_eur:.1f} % Markt), "
            f"Senkung {fn.reduction_mw/1e3:.4f} GW, Spitze {fn.peak_mw/1e3:.4f}",
            flush=True,
        )
        if factor == 2:
            save_dispatch(ROOT / "dispatch" / "x2_fnav_price_lex.csv", intervals, c_f, d_f, e_f, fn)

        out["factors"][str(factor)] = pack
        # Zwischenstand speichern
        (ROOT / "zwischenstand.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    return out


def main_x1_check(intervals) -> dict:
    print("\n===== ×1 Konsistenz (0 zusätzlich) =====", flush=True)
    out = {}
    for mode in ("price", "peak"):
        r, c, d, e = solve_mode(intervals, 1, mode, name=f"x1_{mode}")
        out[mode] = result_to_dict(r)
        print(f"  {mode}: Spitze {r.peak_mw:.4f} MW, Erlös {r.revenue_eur:.4f}, Senkung {r.reduction_mw:.6f}", flush=True)
    return out


def main_daily(intervals, factor=2) -> list[dict]:
    print(f"\n===== Tagesklassen Oktober, ×{factor}, Tageshorizont =====", flush=True)
    by = daily_indices(intervals)
    days = []
    raw = []
    for day, idxs in by.items():
        sl = slice_day(intervals, idxs)
        mkt, c_m, d_m, e_m = solve_mode(sl, factor, "price", name=f"{day}_x{factor}_price")
        # lex peak+price for fair revenue on netz day? For classification we need reduction,
        # revenue of market is max by construction. Use raw min-peak for reduction (unique-ish).
        net, c_n, d_n, e_n, net_raw = solve_lex_peak(sl, factor)
        rec = {
            "date": day,
            "n_intervals": len(sl),
            "baseline_peak_mw": mkt.baseline_peak_mw,
            "baseline_peak_ts": mkt.baseline_peak_ts,
            "market_peak_mw": mkt.peak_mw,
            "market_peak_ts": mkt.peak_ts,
            "market_reduction_gw": mkt.reduction_mw / 1e3,
            "market_revenue_eur": mkt.revenue_eur,
            "netz_peak_mw": net.peak_mw,
            "netz_peak_ts": net.peak_ts,
            "netz_reduction_gw": net.reduction_mw / 1e3,
            "netz_revenue_eur": net.revenue_eur,  # lex, Modellschätzung
            "netz_raw_revenue_eur": net_raw.revenue_eur,
            "share_of_netz_reduction": (mkt.reduction_mw / net.reduction_mw) if net.reduction_mw > 1e-6 else None,
            "market_raises_peak": mkt.reduction_mw < -PEAK_RAISE_TOL_GW * 1e3,
            "price_min": min(it.price_eur_mwh for it in sl),
            "price_max": max(it.price_eur_mwh for it in sl),
            "spread_eur_mwh": max(it.price_eur_mwh for it in sl) - min(it.price_eur_mwh for it in sl),
            "market_runtime_s": mkt.runtime_s,
            "netz_runtime_s": net.runtime_s,
            "market_rte": mkt.rte_grid,
            "netz_rte": net.rte_grid,
            "market_energy_balance_mwh": mkt.energy_balance_residue_mwh,
            "netz_energy_balance_mwh": net.energy_balance_residue_mwh,
        }
        raw.append(rec)
        # keep dispatch for interesting days (21.10 always)
        if day in {"2026-10-21", "2026-10-29", "2026-10-24"} or True:
            # always save, 31 small files
            save_dispatch(ROOT / "dispatch" / "daily" / f"{day}_price.csv", sl, c_m, d_m, e_m, mkt)
            save_dispatch(ROOT / "dispatch" / "daily" / f"{day}_peak.csv", sl, c_n, d_n, e_n, net)
        print(
            f"  {day}: Markt {mkt.reduction_mw/1e3:+.3f} GW / {mkt.revenue_eur/1e6:.3f} Mio, "
            f"Netz {net.reduction_mw/1e3:+.3f} GW, Spread {rec['spread_eur_mwh']:.1f}",
            flush=True,
        )

    max_day_rev = max(r["market_revenue_eur"] for r in raw)
    for rec in raw:
        rec["max_day_revenue_eur"] = max_day_rev
        rec["klasse"] = classify_day(
            rec["market_reduction_gw"],
            rec["netz_reduction_gw"],
            rec["market_revenue_eur"],
            max_day_rev,
        )
    return raw


def monthly_slice_classes(intervals, factor=2) -> list[dict]:
    """Sensitivität: Tageswerte aus dem Monatsfahrplan (durchgehender SoC)."""
    print("  Sensitivität: Tagesscheiben des Monatsfahrplans …", flush=True)
    mkt, c_m, d_m, e_m = solve_lex_price(intervals, factor)[:4] if False else (None, None, None, None)
    # load from files if already solved — re-solve lex to be self-contained
    mkt, c_m, d_m, e_m, _ = solve_lex_price(intervals, factor)
    net, c_n, d_n, e_n, _ = solve_lex_peak(intervals, factor)
    by = daily_indices(intervals)
    rows = []
    prices = np.array([it.price_eur_mwh for it in intervals])
    R = np.array([it.residual_mw for it in intervals])
    for day, idxs in by.items():
        ix = np.array(idxs)
        r_day = R[ix]
        rp_m = r_day + c_m[ix] - d_m[ix]
        rp_n = r_day + c_n[ix] - d_n[ix]
        rev_m = float(np.sum(prices[ix] * (d_m[ix] - c_m[ix]) * DT_H))
        rev_n = float(np.sum(prices[ix] * (d_n[ix] - c_n[ix]) * DT_H))
        rows.append(
            {
                "date": day,
                "source": "month_dispatch_slice",
                "baseline_peak_mw": float(r_day.max()),
                "market_peak_mw": float(rp_m.max()),
                "market_reduction_gw": float((r_day.max() - rp_m.max()) / 1e3),
                "market_revenue_eur": rev_m,
                "netz_peak_mw": float(rp_n.max()),
                "netz_reduction_gw": float((r_day.max() - rp_n.max()) / 1e3),
                "netz_revenue_eur": rev_n,
                "soc_start_mwh": float(e_m[idxs[0]]),
                "soc_end_mwh": float(e_m[idxs[-1] + 1]),
            }
        )
    max_day_rev = max(r["market_revenue_eur"] for r in rows)
    for rec in rows:
        rec["share_of_netz_reduction"] = (
            rec["market_reduction_gw"] / rec["netz_reduction_gw"] if abs(rec["netz_reduction_gw"]) > 1e-6 else None
        )
        rec["klasse"] = classify_day(
            rec["market_reduction_gw"],
            rec["netz_reduction_gw"],
            rec["market_revenue_eur"],
            max_day_rev,
        )
    return rows


def consistency_report(data: dict, x1: dict, intervals) -> dict:
    Rmax = max(it.residual_mw for it in intervals)
    checks = []

    def add(name, ok, detail):
        checks.append({"name": name, "ok": bool(ok), "detail": detail})
        print(f"  {'OK' if ok else 'FAIL'}: {name} — {detail}")

    # ×1
    for mode, r in x1.items():
        add(
            f"x1_{mode}_peak_64405.9",
            abs(r["peak_mw"] - REF_PEAK_MW) < 0.05,
            f"peak={r['peak_mw']:.4f}, expected {REF_PEAK_MW}",
        )
        add(f"x1_{mode}_revenue_zero", abs(r["revenue_eur"]) < 1e-6, f"revenue={r['revenue_eur']}")
        add(f"x1_{mode}_reduction_zero", abs(r["reduction_mw"]) < 1e-6, f"red={r['reduction_mw']}")

    # observed peak
    add("observed_peak", abs(Rmax - REF_PEAK_MW) < 0.05, f"{Rmax} vs {REF_PEAK_MW}")

    # v3 / PR99 netz
    for fac, ref in [(2, REF_X2_NETZ_SENKUNG_GW), (5, REF_X5_NETZ_SENKUNG_GW), (10, REF_X10_NETZ_SENKUNG_GW)]:
        got = data["factors"][str(fac)]["netz_lex"]["reduction_gw"]
        add(f"x{fac}_netz_senkung_vs_v3", abs(got - ref) < 0.005, f"{got:.6f} vs v3 {ref:.6f} GW (Tol 0,005)")

    x10_peak = data["factors"]["10"]["netz_lex"]["peak_gw"]
    add("x10_netz_peak_50.43", abs(x10_peak - REF_X10_NETZ_GW) < 0.015, f"{x10_peak:.4f} vs 50,43 GW")

    x10_mkt = data["factors"]["10"]["market_lex"]["peak_gw"]
    add("x10_markt_peak_92.72", abs(x10_mkt - REF_X10_MARKT_GW) < 0.05, f"{x10_mkt:.4f} vs 92,72 GW (PR #99)")

    # RTE and energy for all stored results
    def walk(obj, prefix=""):
        if isinstance(obj, dict):
            if "rte_grid" in obj:
                rte = obj["rte_grid"]
                bal = obj.get("energy_balance_residue_mwh", 0)
                sim = obj.get("simultaneous_max_mw", 0)
                add(
                    f"{prefix}rte_85",
                    (abs(rte - 0.85) < 0.002) or (obj.get("charge_mwh", 1) < 1e-6),
                    f"rte={rte:.6f}, charge={obj.get('charge_mwh')}",
                )
                add(f"{prefix}soc_balance", abs(bal) < 0.05, f"residue={bal:.6e} MWh")
                add(f"{prefix}no_simultaneous", sim < 1.0, f"sim_max={sim:.4f} MW")
                add(
                    f"{prefix}soc_start_end_50",
                    abs(obj["soc_start_mwh"] - 0.5 * obj["energy_mwh"]) < 0.05
                    and abs(obj["soc_end_mwh"] - 0.5 * obj["energy_mwh"]) < 0.05,
                    f"start={obj['soc_start_mwh']:.3f} end={obj['soc_end_mwh']:.3f} mid={0.5*obj['energy_mwh']:.3f}",
                )
            else:
                for k, v in obj.items():
                    walk(v, prefix + k + "/")

    walk(data["factors"])
    return {"checks": checks, "n_ok": sum(1 for c in checks if c["ok"]), "n": len(checks)}


def write_csvs(data, daily, monthly_slices, x1, checks, intervals) -> None:
    # Pareto combined
    rows = []
    for fac, pack in data["factors"].items():
        def addp(src, d):
            rows.append(
                {
                    "factor": int(fac),
                    "source": src,
                    "name": d.get("name"),
                    "mode": d.get("mode"),
                    "lam_eur_per_mw": d.get("lam_eur_per_mw"),
                    "revenue_eur": d.get("revenue_eur"),
                    "revenue_mio_eur": d.get("revenue_mio_eur"),
                    "peak_mw": d.get("peak_mw"),
                    "peak_gw": d.get("peak_gw"),
                    "peak_ts": d.get("peak_ts"),
                    "reduction_mw": d.get("reduction_mw"),
                    "reduction_gw": d.get("reduction_gw"),
                    "baseline_peak_gw": d.get("baseline_peak_gw"),
                    "charge_mwh": d.get("charge_mwh"),
                    "discharge_mwh": d.get("discharge_mwh"),
                    "rte_grid": d.get("rte_grid"),
                    "runtime_s": d.get("runtime_s"),
                    "notes": d.get("notes"),
                    "frac_rev": None,
                    "frac_red": None,
                }
            )

        addp("market_lex", pack["market_lex"])
        addp("netz_lex", pack["netz_lex"])
        addp("fnav_lex", pack["fnav_lex"])
        addp("eps50", pack["eps50"])
        addp("eps70", pack["eps70"])
        addp("eps90", pack["eps90"])
        for d in pack["grid_points"]:
            addp("lam_grid", d)
        for d in pack["dichotomy_points"]:
            addp("dichotomy", d)
        # fractions vs this factor's endpoints
        mrev = pack["market_lex"]["revenue_eur"]
        nred = pack["netz_lex"]["reduction_mw"]
        for r in rows:
            if r["factor"] == int(fac) and r["frac_rev"] is None:
                r["frac_rev"] = r["revenue_eur"] / mrev if mrev else None
                r["frac_red"] = r["reduction_mw"] / nred if nred else None

    path = ROOT / "pareto_punkte.csv"
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    path = ROOT / "tagesklassen_oktober.csv"
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(daily[0].keys()))
        w.writeheader()
        w.writerows(daily)

    path = ROOT / "tagesklassen_monatsscheibe.csv"
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(monthly_slices[0].keys()))
        w.writeheader()
        w.writerows(monthly_slices)

    (ROOT / "x1_konsistenz.json").write_text(json.dumps(x1, indent=2, ensure_ascii=False), encoding="utf-8")
    (ROOT / "checks.json").write_text(json.dumps(checks, indent=2, ensure_ascii=False), encoding="utf-8")
    (ROOT / "pareto_voll.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def main(argv: list[str]) -> int:
    t_all = time.perf_counter()
    print("Lade Daten …", flush=True)
    intervals = load_intervals()
    digest = sha256(INPUT_CSV)
    print(f"  {len(intervals)} Intervalle, sha256={digest}", flush=True)
    R = np.array([it.residual_mw for it in intervals])
    print(f"  Restlastspitze {R.max():.2f} MW um {intervals[int(R.argmax())].ts}", flush=True)

    meta = {
        "input_csv": str(INPUT_CSV),
        "input_sha256": digest,
        "source_original": "/workspace/sp-ro/artifacts/october-storage-counterfactual-20261107/inputs/beobachtungen-viertelstunden-202610-berlin.csv",
        "fleet_power_mw": FLEET_POWER_MW,
        "fleet_energy_mwh": FLEET_ENERGY_MWH,
        "fleet_source": "battery-charts Großspeicher, Monatswert 31.10.2026, Abruf 10.11.2026 (nachrechnung v3 / fleetBasis.ts)",
        "convention": "a: x1=0 zusätzlich, xk=(k-1)*Basis",
        "rte": RTE,
        "eta": ETA,
        "soc": "10–90 %, Start=Ende=50 %",
        "solver": "scipy.optimize.linprog method=highs (HiGHS LP)",
        "reference_mip": "MonthStorageMip in artifacts/october-storage-counterfactual-20261107/mip_month.py",
        "timezone": "Europe/Berlin",
        "fnav": "statisches Entnahmeverbot 16:00–21:00 Europe/Berlin, Einspeisung frei",
        "generated_at": datetime.now(BERLIN).isoformat(),
        "euro_policy": "Euro-Beträge nur für ×2 (eine Zusatzflotte heutiger Größe), beschriftet Modellschätzung",
    }
    (ROOT / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    x1 = main_x1_check(intervals)
    data = main_endpoints_and_sweep(intervals, factors=(2, 5, 10))
    daily = main_daily(intervals, factor=2)
    slices = monthly_slice_classes(intervals, factor=2)
    print("\n===== Konsistenz =====", flush=True)
    checks = consistency_report(data, x1, intervals)
    write_csvs(data, daily, slices, x1, checks, intervals)

    # kurze Klassenzählung
    from collections import Counter

    cnt = Counter(r["klasse"] for r in daily)
    print(f"\nTagesklassen (Tageshorizont, ×2): {dict(cnt)}", flush=True)
    cnt2 = Counter(r["klasse"] for r in slices)
    print(f"Tagesklassen (Monatsscheibe, ×2): {dict(cnt2)}", flush=True)

    elapsed = time.perf_counter() - t_all
    print(f"\nFertig in {elapsed/60:.1f} min. Checks {checks['n_ok']}/{checks['n']} OK.", flush=True)
    (ROOT / "laufzeit.json").write_text(
        json.dumps({"elapsed_s": elapsed, "checks": checks["n_ok"], "n": checks["n"]}, indent=2),
        encoding="utf-8",
    )
    return 0 if checks["n_ok"] == checks["n"] else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
