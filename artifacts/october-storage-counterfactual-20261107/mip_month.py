"""Month-scale exclusive storage MIP (shared HiGHS formulation)."""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime

import highspy
import numpy as np

DT_H = 0.25
RTE = 0.85
ETA = math.sqrt(RTE)


@dataclass
class SolveReport:
    status: str
    objective: float | None
    mip_gap: float | None
    runtime_s: float
    solver: str
    notes: str = ""


class MonthStorageMip:
    """Exclusive charge/discharge; SoC 10–90 % nominal; fixed 50 % start and end."""

    def __init__(self, n: int, p_mw: float, e_nom_mwh: float) -> None:
        self.n = n
        self.p_mw = p_mw
        self.e_nom = e_nom_mwh
        self.e_start = 0.5 * e_nom_mwh
        self.e_min = 0.1 * e_nom_mwh
        self.e_max = 0.9 * e_nom_mwh
        self.h = highspy.Highs()
        self.h.setOptionValue("output_flag", False)
        self.h.setOptionValue("log_to_console", False)
        self.h.setOptionValue("time_limit", 900.0)
        self.h.setOptionValue("mip_rel_gap", 1e-4)

        self.nc = 4 * n + 2
        self.col_c = np.arange(n, dtype=np.int32)
        self.col_d = np.arange(n, 2 * n, dtype=np.int32)
        self.col_z = np.arange(2 * n, 3 * n, dtype=np.int32)
        self.col_e = np.arange(3 * n, 4 * n + 1, dtype=np.int32)
        self.col_M = np.int32(4 * n + 1)
        lo = np.zeros(self.nc)
        hi = np.full(self.nc, highspy.kHighsInf)
        hi[: 2 * n] = p_mw
        hi[2 * n : 3 * n] = 1.0
        hi[3 * n : 4 * n + 1] = self.e_max
        hi[self.col_M] = highspy.kHighsInf
        integrality = np.zeros(self.nc, dtype=np.int32)
        integrality[2 * n : 3 * n] = 1
        self.h.addCols(self.nc, np.zeros(self.nc), lo, hi, 0, [], [], [])
        self.h.changeColsIntegrality(self.nc, np.arange(self.nc, dtype=np.int32), integrality)

        starts = [0]
        idx: list[int] = []
        val: list[float] = []
        for t in range(n):
            idx.extend([self.col_e[t], self.col_e[t + 1], self.col_c[t], self.col_d[t]])
            # e[t+1] = e[t] + η_c·c·dt − d·dt/η_d
            val.extend([1.0, -1.0, ETA * DT_H, -DT_H / ETA])
            starts.append(len(idx))
        idx.extend([self.col_e[0], self.col_e[n]])
        val.extend([1.0, -1.0])
        starts.append(len(idx))
        self.h.addRows(n + 1, np.zeros(n + 1), np.zeros(n + 1), len(idx), starts, idx, val)

        ex_lo = np.full(2 * n, -highspy.kHighsInf)
        ex_hi = np.zeros(2 * n)
        ex_s = [0]
        ex_i: list[int] = []
        ex_v: list[float] = []
        for t in range(n):
            ex_i.extend([self.col_c[t], self.col_z[t]])
            ex_v.extend([1.0, -p_mw if p_mw > 0 else -1.0])
            ex_s.append(len(ex_i))
            ex_i.extend([self.col_d[t], self.col_z[t]])
            ex_v.extend([1.0, p_mw if p_mw > 0 else 1.0])
            ex_s.append(len(ex_i))
            ex_hi[2 * t + 1] = p_mw
        self.h.addRows(2 * n, ex_lo, ex_hi, len(ex_i), ex_s, ex_i, ex_v)

    def _solution(self) -> tuple[np.ndarray, np.ndarray, np.ndarray, SolveReport]:
        t0 = datetime.now().timestamp()
        self.h.run()
        rt = datetime.now().timestamp() - t0
        status = str(self.h.getModelStatus())
        info = self.h.getInfo()
        gap = getattr(info, "mip_gap", None)
        obj = float(info.objective_function_value) if np.isfinite(info.objective_function_value) else None
        if "kOptimal" not in status and "kObjectiveBound" not in status and "kTimeLimit" not in status:
            raise RuntimeError(f"MIP failed: {status}")
        sol = np.array(self.h.getSolution().col_value, dtype=float)
        rep = SolveReport(status, obj, gap, rt, "HiGHS")
        return sol[: self.n], sol[self.n : 2 * self.n], sol[3 * self.n : 4 * self.n + 1], rep

    def _fix_e_bounds(self, surplus_cap: np.ndarray | None = None, residual_cap: np.ndarray | None = None) -> None:
        lo = np.zeros(self.nc)
        hi = np.full(self.nc, highspy.kHighsInf)
        for t in range(self.n):
            pc = self.p_mw
            pd = self.p_mw
            if surplus_cap is not None:
                pc = min(pc, float(surplus_cap[t]))
            if residual_cap is not None:
                pd = min(pd, max(0.0, float(residual_cap[t])))
            hi[t] = pc
            hi[self.n + t] = pd
        hi[2 * self.n : 3 * self.n] = 1.0
        hi[3 * self.n : 4 * self.n + 1] = self.e_max
        lo[3 * self.n : 4 * self.n + 1] = self.e_min
        lo[self.col_e[0]] = self.e_start
        lo[self.col_e[self.n]] = self.e_start
        hi[self.col_e[0]] = self.e_start
        hi[self.col_e[self.n]] = self.e_start
        self.h.changeColsBounds(self.nc, np.arange(self.nc, dtype=np.int32), lo, hi)

    def solve_min_peak(self, residual: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, SolveReport]:
        n = self.n
        cost = np.zeros(self.nc)
        cost[self.col_M] = 1.0
        cost[self.col_c] = 1e-6 * DT_H
        cost[self.col_d] = 1e-6 * DT_H
        self.h.changeColsCost(self.nc, np.arange(self.nc, dtype=np.int32), cost)
        self.h.changeObjectiveSense(highspy.ObjSense.kMinimize)
        peak_lo = np.full(n, -highspy.kHighsInf)
        peak_hi = np.zeros(n)
        peak_s = [0]
        peak_i: list[int] = []
        peak_v: list[float] = []
        for t in range(n):
            peak_i.extend([self.col_c[t], self.col_d[t], self.col_M])
            peak_v.extend([1.0, -1.0, -1.0])
            peak_s.append(len(peak_i))
            peak_hi[t] = -residual[t]
        self.h.addRows(n, peak_lo, peak_hi, len(peak_i), peak_s, peak_i, peak_v)
        self._fix_e_bounds()
        return self._solution()

    def solve_price(self, prices: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, SolveReport]:
        scaled = prices * DT_H
        cost = np.zeros(self.nc)
        cost[self.col_c] = scaled
        cost[self.col_d] = -scaled
        self.h.changeColsCost(self.nc, np.arange(self.nc, dtype=np.int32), cost)
        self.h.changeObjectiveSense(highspy.ObjSense.kMinimize)
        self._fix_e_bounds()
        return self._solution()

    def solve_surplus_capture_max(
        self, surplus_mw: np.ndarray, residual: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, SolveReport]:
        """Maximize grid-side uptake of max(0, wind+solar−load) under surplus/discharge rules."""
        self._fix_e_bounds(surplus_cap=surplus_mw, residual_cap=residual)
        cost = np.zeros(self.nc)
        cost[self.col_c] = -DT_H
        self.h.changeColsCost(self.nc, np.arange(self.nc, dtype=np.int32), cost)
        self.h.changeObjectiveSense(highspy.ObjSense.kMinimize)
        c, d, e, rep = self._solution()
        rep.notes = f"capture_mwh={float(np.sum(c) * DT_H):.6f}"
        return c, d, e, rep

    def solve_surplus_capture_tiebreak_peak(
        self,
        surplus_mw: np.ndarray,
        residual: np.ndarray,
        capture_mwh_floor: float,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, SolveReport]:
        """Same physics/caps; capture ≥ floor; minimize month max of R′."""
        n = self.n
        self._fix_e_bounds(surplus_cap=surplus_mw, residual_cap=residual)
        cap_s = [0, n]
        cap_i = list(self.col_c.astype(int))
        cap_v = [-DT_H] * n
        self.h.addRows(
            1,
            np.array([-highspy.kHighsInf]),
            np.array([-capture_mwh_floor + 1e-3]),
            len(cap_i),
            cap_s,
            cap_i,
            cap_v,
        )
        cost = np.zeros(self.nc)
        cost[self.col_M] = 1.0
        self.h.changeColsCost(self.nc, np.arange(self.nc, dtype=np.int32), cost)
        self.h.changeObjectiveSense(highspy.ObjSense.kMinimize)
        peak_lo = np.full(n, -highspy.kHighsInf)
        peak_hi = np.zeros(n)
        peak_s = [0]
        peak_i: list[int] = []
        peak_v: list[float] = []
        for t in range(n):
            peak_i.extend([self.col_c[t], self.col_d[t], self.col_M])
            peak_v.extend([1.0, -1.0, -1.0])
            peak_s.append(len(peak_i))
            peak_hi[t] = -residual[t]
        self.h.addRows(n, peak_lo, peak_hi, len(peak_i), peak_s, peak_i, peak_v)
        c, d, e, rep = self._solution()
        rep.notes = f"capture_floor_mwh={capture_mwh_floor:.6f}; tie_break_peak_mw={rep.objective}"
        return c, d, e, rep
