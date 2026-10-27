#!/usr/bin/env python3
"""Daily storage LP used by the scenario tests.

Same formulation as scripts/build-fca-table.py. The page does not import this.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import highspy
import numpy as np

ETA = math.sqrt(0.85)
DT = 0.25
ROOT = Path(__file__).resolve().parents[1]


class DayModel:
    def __init__(self, n: int, eta: float = ETA) -> None:
        self.n = n
        self.eta = eta
        self.h = highspy.Highs()
        self.h.setOptionValue("output_flag", False)
        self.h.setOptionValue("log_to_console", False)
        a_c = eta * DT
        a_d = -(DT / eta)
        zeros = np.zeros(2 * n)
        ones = np.ones(2 * n)
        self.h.addCols(2 * n, zeros, zeros, ones, 0, [], [], [])
        self.h.changeObjectiveSense(highspy.ObjSense.kMaximize)
        starts = [0]
        index: list[int] = []
        value: list[float] = []
        for quarter in range(n):
            for i in range(quarter + 1):
                index.append(i)
                value.append(a_c)
                index.append(n + i)
                value.append(a_d)
            starts.append(len(index))
        self.h.addRows(n, np.full(n, -1.0), np.full(n, 1.0), len(index), starts, index, value)
        self.col_index = np.arange(2 * n, dtype=np.int32)
        self.row_index = np.arange(n, dtype=np.int32)
        self.lower = np.zeros(2 * n)
        self.upper = np.ones(2 * n)
        self.cost = np.zeros(2 * n)
        self.row_lo = np.zeros(n)
        self.row_hi = np.zeros(n)

    def solve(self, prices: list[float], power: float, energy: float, limit: float) -> float:
        prices_a = np.asarray(prices, dtype=float)
        scaled = prices_a * DT
        self.cost[: self.n] = -scaled
        self.cost[self.n :] = scaled
        cap = min(max(limit, 0.0), power)
        self.upper.fill(cap)
        self.h.changeColsCost(2 * self.n, self.col_index, self.cost)
        self.h.changeColsBounds(2 * self.n, self.col_index, self.lower, self.upper)
        s0 = 0.5 * energy
        span_down = s0 - 0.1 * energy
        span_up = 0.9 * energy - s0
        self.row_lo.fill(-span_down)
        self.row_hi.fill(span_up)
        self.row_lo[-1] = 0.0
        self.h.changeRowsBounds(self.n, self.row_index, self.row_lo, self.row_hi)
        self.h.run()
        value = float(self.h.getObjectiveValue())
        if value < -1e-6:
            raise SystemExit(f"negative objective {value}")
        return 0.0 if abs(value) < 1e-8 else value


def hand() -> dict:
    prices = [10, 10, 10, 10, 100, 100, 100, 100]
    perfect = DayModel(8, eta=1.0)
    lossy = DayModel(8, eta=ETA)
    base = lossy.solve(prices, 10, 20, 4)
    doubled = lossy.solve(prices, 20, 40, 8)
    return {
        "eta1": {str(limit): round(perfect.solve(prices, 10, 20, limit), 2) for limit in (10, 4, 0)},
        "eta": {str(limit): round(lossy.solve(prices, 10, 20, limit), 2) for limit in (10, 4)},
        "homogeneity": abs(doubled - 2 * base),
    }


def day_value(date_key: str, power: float, energy: float, limit: float) -> float:
    payload = json.loads((ROOT / "data" / "fca" / "prices-12m.json").read_text(encoding="utf-8"))
    day = next(item for item in payload["days"] if item["date"] == date_key)
    model = DayModel(len(day["prices"]))
    return model.solve(day["prices"], power, energy, limit)


def sample_properties() -> dict:
    payload = json.loads((ROOT / "data" / "fca" / "prices-12m.json").read_text(encoding="utf-8"))
    days = payload["days"]
    picked = [days[index] for index in range(0, len(days), max(1, len(days) // 20))][:20]
    limits = [0, 20.7, 41.4, 62.1, 82.8, 103.5]
    worst_mono = 0.0
    worst_concave = 0.0
    negative = False
    for day in picked:
        model = DayModel(len(day["prices"]))
        values = [model.solve(day["prices"], 103.5, 238.5, limit) for limit in limits]
        if any(value < -1e-6 for value in values):
            negative = True
        for left, right in zip(values, values[1:]):
            worst_mono = min(worst_mono, right - left)
        for left, mid, right in zip(values, values[1:], values[2:]):
            worst_concave = min(worst_concave, mid - 0.5 * (left + right))
        if abs(values[0]) > 1e-6:
            raise SystemExit("zero limit was not zero")
    return {"days": len(picked), "worstMono": worst_mono, "worstConcave": worst_concave, "negative": negative}


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else "hand"
    if command == "hand":
        print(json.dumps(hand()))
        return
    if command == "day":
        _, _, date_key, power, energy, limit = sys.argv
        print(json.dumps({"eur": round(day_value(date_key, float(power), float(energy), float(limit)), 2)}))
        return
    if command == "sample":
        print(json.dumps(sample_properties()))
        return
    raise SystemExit(f"unknown command {command}")


if __name__ == "__main__":
    main()
