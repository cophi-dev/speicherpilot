#!/usr/bin/env python3
"""Build the offline FCA scenario table.

Solves the daily linear programme from the scenario spec with HiGHS and writes
normalised monthly revenue (€ per MW) for two price years and three limit shapes.
The page only interpolates this file. It does not call the repo dispatch core.
Needs HiGHS: pip install -r scripts/requirements-fca.txt
"""

from __future__ import annotations

import json
import math
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import highspy
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "fca"
PUBLIC_DIR = ROOT / "public" / "fca"
PRICE_URL = "https://api.energy-charts.info/v2/price?bzn=DE-LU&start={start}&end={end}"
BERLIN = ZoneInfo("Europe/Berlin")
RETRIEVED = "2026-10-27"
ETA = math.sqrt(0.85)
DT = 0.25
HOURS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 6.0]
LIMITS = [round(i * 0.05, 2) for i in range(21)]
FORMS = ("fest", "abend", "mittag")
YEARS = {
    "12m": {
        "label": "letzte 12 Monate (bis 26.10.2026)",
        "start": date(2025, 10, 27),
        "end": date(2026, 10, 26),
    },
    "2025": {
        "label": "Kalenderjahr 2025",
        "start": date(2025, 1, 1),
        "end": date(2025, 12, 31),
    },
}

# Reference day revenues for 103.5 MW / 238.5 MWh, fest, last-12-month prices.
REFERENCE_DAYS = {
    "2026-05-01": {103.5: 149_589, 51.75: 108_136, 25.9: 66_743},
    "2026-06-24": {103.5: 101_073, 77.6: None, 51.75: 78_372, 25.9: 52_169},
    "2026-04-14": {103.5: 25_454, 51.75: 16_180, 25.9: 9_243},
}
YEAR_SUMS = {
    103.5: 9_712_347,
    77.6: 8_969_653,
    51.75: 7_780_594,
    25.9: 5_448_336,
    10.35: 2_399_251,
    5: 1_159_253,
}


def fetch_chunk(start: date, end: date) -> list[dict]:
    url = PRICE_URL.format(start=start.isoformat(), end=end.isoformat())
    delay = 2.0
    for attempt in range(8):
        print(f"fetch {url} attempt {attempt + 1}", flush=True)
        request = urllib.request.Request(url, headers={"User-Agent": "speicherpilot-fca-table/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < 7:
                print(f"  429, sleeping {delay:.0f}s", flush=True)
                time.sleep(delay)
                delay *= 2
                continue
            raise
        data = payload.get("data")
        if not isinstance(data, list) or not data:
            raise SystemExit(f"price feed returned no rows for {start}–{end}")
        return data
    raise SystemExit(f"price feed failed for {start}–{end}")


def fetch_range(start: date, end: date) -> list[dict]:
    cache_dir = OUT_DIR / "chunks"
    cache_dir.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    cursor = start
    while cursor <= end:
        chunk_end = min(end, cursor + timedelta(days=61))
        cache = cache_dir / f"{cursor.isoformat()}_{chunk_end.isoformat()}.json"
        if cache.exists():
            data = json.loads(cache.read_text(encoding="utf-8"))
            print(f"cache {cache.name} ({len(data)} rows)", flush=True)
        else:
            data = fetch_chunk(cursor, chunk_end)
            cache.write_text(json.dumps(data), encoding="utf-8")
            time.sleep(1.5)
        rows.extend(data)
        cursor = chunk_end + timedelta(days=1)
    return rows


def parse_rows(rows: list[dict]) -> dict[str, dict]:
    """Group the feed into Berlin days of quarter-hour prices and window masks."""
    buckets: dict[str, list[tuple[datetime, float]]] = {}
    for row in rows:
        stamp = datetime.fromisoformat(row["timestamp"]).astimezone(BERLIN)
        price = row["values"]["day_ahead_price"]
        if not isinstance(price, (int, float)) or not math.isfinite(price):
            raise SystemExit(f"missing price at {row.get('timestamp')}")
        buckets.setdefault(stamp.date().isoformat(), []).append((stamp, float(price)))

    days: dict[str, dict] = {}
    for key in sorted(buckets):
        slots = sorted(buckets[key], key=lambda item: item[0])
        # Hourly auctions repeat across the four quarter-hours of that clock hour.
        expanded: list[tuple[datetime, float]] = []
        if len(slots) <= 25:
            for stamp, price in slots:
                for step in range(4):
                    expanded.append((stamp + timedelta(minutes=15 * step), price))
        else:
            expanded = slots
        if len(expanded) not in (92, 96, 100):
            raise SystemExit(f"{key} has {len(expanded)} quarter-hours, expected 92, 96 or 100")
        prices = [round(price, 2) for _, price in expanded]
        hours = []
        minutes = []
        for stamp, _ in expanded:
            hours.append(stamp.hour)
            minutes.append(stamp.minute)
        clock = [hour * 60 + minute for hour, minute in zip(hours, minutes)]
        days[key] = {
            "date": key,
            "prices": prices,
            "abend": [17 * 60 <= minute < 21 * 60 for minute in clock],
            "mittag": [10 * 60 <= minute < 16 * 60 for minute in clock],
        }
    return days


def slice_year(days: dict[str, dict], start: date, end: date) -> list[dict]:
    chosen = []
    cursor = start
    while cursor <= end:
        key = cursor.isoformat()
        day = days.get(key)
        if day is None:
            raise SystemExit(f"missing day {key}")
        chosen.append(day)
        cursor += timedelta(days=1)
    if len(chosen) != 365:
        raise SystemExit(f"expected 365 days, got {len(chosen)} for {start}–{end}")
    return chosen


class DayModel:
    def __init__(self, n: int) -> None:
        self.n = n
        self.h = highspy.Highs()
        self.h.setOptionValue("output_flag", False)
        self.h.setOptionValue("log_to_console", False)
        a_c = ETA * DT
        a_d = -(DT / ETA)
        zeros = np.zeros(2 * n)
        ones = np.ones(2 * n)
        self.h.addCols(2 * n, zeros, zeros, ones, 0, [], [], [])
        self.h.changeObjectiveSense(highspy.ObjSense.kMaximize)
        starts = [0]
        index: list[int] = []
        value: list[float] = []
        for q in range(n):
            for i in range(q + 1):
                index.append(i)
                value.append(a_c)
                index.append(n + i)
                value.append(a_d)
            starts.append(len(index))
        self.h.addRows(n, np.full(n, -0.4), np.full(n, 0.4), len(index), starts, index, value)
        self.col_index = np.arange(2 * n, dtype=np.int32)
        self.row_index = np.arange(n, dtype=np.int32)
        self.lower = np.zeros(2 * n)
        self.upper = np.ones(2 * n)
        self.cost = np.zeros(2 * n)
        self.row_lo = np.zeros(n)
        self.row_hi = np.zeros(n)

    def set_prices(self, prices: list[float]) -> None:
        scaled = np.asarray(prices, dtype=float) * DT
        self.cost[: self.n] = -scaled
        self.cost[self.n :] = scaled
        self.h.changeColsCost(2 * self.n, self.col_index, self.cost)

    def set_hours(self, hours: float) -> None:
        span = 0.4 * hours
        self.row_lo.fill(-span)
        self.row_hi.fill(span)
        self.row_lo[-1] = 0.0
        self.h.changeRowsBounds(self.n, self.row_index, self.row_lo, self.row_hi)

    def set_caps(self, caps: np.ndarray) -> None:
        self.upper[: self.n] = caps
        self.upper[self.n :] = caps
        self.h.changeColsBounds(2 * self.n, self.col_index, self.lower, self.upper)

    def solve(self) -> float:
        self.h.run()
        value = float(self.h.getObjectiveValue())
        if not math.isfinite(value):
            raise SystemExit("solver returned a non-finite objective")
        if value < -1e-6:
            raise SystemExit(f"negative day value {value}")
        return 0.0 if abs(value) < 1e-8 else value


def solve_power(days: list[dict], power: float, energy: float, limit: float) -> list[float]:
    """Absolute euro revenue per day at one power, energy and flat limit."""
    models = {92: DayModel(92), 96: DayModel(96), 100: DayModel(100)}
    ratio = energy / power
    cap = min(limit / power, 1.0)
    out = []
    for day in days:
        model = models[len(day["prices"])]
        model.set_prices(day["prices"])
        model.set_hours(ratio)
        model.set_caps(np.full(model.n, cap))
        out.append(model.solve() * power)
    return out


def accumulate(days: list[dict]) -> tuple[np.ndarray, list[int]]:
    """Return values[form, h, g, month] in €/MW and day counts per calendar month."""
    models = {92: DayModel(92), 96: DayModel(96), 100: DayModel(100)}
    values = np.zeros((len(FORMS), len(HOURS), len(LIMITS), 12), dtype=float)
    month_days = [0] * 12
    caps_full = {n: np.ones(n) for n in models}
    for index, day in enumerate(days):
        if index % 40 == 0:
            print(f"  day {index + 1}/{len(days)} {day['date']}", flush=True)
        n = len(day["prices"])
        model = models[n]
        model.set_prices(day["prices"])
        month = int(day["date"][5:7]) - 1
        month_days[month] += 1
        masks = {
            "fest": np.ones(n, dtype=bool),
            "abend": np.asarray(day["abend"], dtype=bool),
            "mittag": np.asarray(day["mittag"], dtype=bool),
        }
        for form_index, form in enumerate(FORMS):
            mask = masks[form]
            for hour_index, hours in enumerate(HOURS):
                model.set_hours(hours)
                for limit_index, limit in enumerate(LIMITS):
                    if limit == 1:
                        caps = caps_full[n]
                    else:
                        caps = np.where(mask, limit, 1.0)
                    model.set_caps(caps)
                    values[form_index, hour_index, limit_index, month] += model.solve()
    return values, month_days


def check_shape(values: np.ndarray, label: str) -> None:
    # Monotone in the limit: a higher cap never earns less.
    diffs = np.diff(values, axis=2)
    worst = float(diffs.min())
    if worst < -1e-4:
        raise SystemExit(f"{label} is not monotone in the limit (worst {worst})")
    # Concave in the limit: the chord sits on or under the function.
    for form in range(values.shape[0]):
        for hour in range(values.shape[1]):
            for month in range(values.shape[3]):
                series = values[form, hour, :, month]
                mids = series[1:-1]
                chords = 0.5 * (series[:-2] + series[2:])
                slack = float((mids - chords).min())
                if slack < -1e-3:
                    raise SystemExit(f"{label} is not concave in the limit (slack {slack})")
    if float(np.max(np.abs(values[:, :, 0, :][0:1]))) > 1e-6:
        # Only the flat form is zero at a zero limit. Window forms still trade outside.
        pass
    flat_zero = float(np.max(np.abs(values[0, :, 0, :])))
    if flat_zero > 1e-6:
        raise SystemExit(f"{label} flat zero-limit is {flat_zero}")
    full = values[:, :, -1, :]
    spread = float(np.max(np.abs(full - full[0:1])))
    if spread > 1e-3:
        raise SystemExit(f"{label} full-limit forms differ by {spread}")
    if float(values.min()) < -1e-6:
        raise SystemExit(f"{label} has a negative month")


def bilinear(values: np.ndarray, form: int, hours: float, limit: float) -> np.ndarray:
    hour_index = 0
    while hour_index < len(HOURS) - 1 and HOURS[hour_index + 1] < hours:
        hour_index += 1
    limit_index = 0
    while limit_index < len(LIMITS) - 1 and LIMITS[limit_index + 1] < limit:
        limit_index += 1
    h0, h1 = HOURS[hour_index], HOURS[min(hour_index + 1, len(HOURS) - 1)]
    g0, g1 = LIMITS[limit_index], LIMITS[min(limit_index + 1, len(LIMITS) - 1)]
    th = 0.0 if h1 == h0 else (hours - h0) / (h1 - h0)
    tg = 0.0 if g1 == g0 else (limit - g0) / (g1 - g0)
    v00 = values[form, hour_index, limit_index]
    v10 = values[form, min(hour_index + 1, len(HOURS) - 1), limit_index]
    v01 = values[form, hour_index, min(limit_index + 1, len(LIMITS) - 1)]
    v11 = values[form, min(hour_index + 1, len(HOURS) - 1), min(limit_index + 1, len(LIMITS) - 1)]
    return (1 - th) * (1 - tg) * v00 + th * (1 - tg) * v10 + (1 - th) * tg * v01 + th * tg * v11


def round_values(values: np.ndarray) -> list:
    rounded = np.round(values, 4)
    return rounded.tolist()


def write_prices(name: str, days: list[dict]) -> None:
    payload = {
        "retrieved": RETRIEVED,
        "source": "Energy-Charts DE-LU (Bundesnetzagentur | SMARD.de, CC BY 4.0)",
        "href": "https://api.energy-charts.info/v2/price?bzn=DE-LU",
        "days": [{"date": day["date"], "prices": day["prices"]} for day in days],
    }
    path = OUT_DIR / name
    path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path} ({path.stat().st_size} bytes)", flush=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = OUT_DIR / "prices-raw.json"
    if raw_path.exists() and "--refresh" not in sys.argv:
        print(f"using cached {raw_path}", flush=True)
        raw_rows = json.loads(raw_path.read_text(encoding="utf-8"))
    else:
        raw_rows = fetch_range(date(2025, 1, 1), date(2026, 10, 26))
        raw_path.write_text(json.dumps(raw_rows), encoding="utf-8")
    days = parse_rows(raw_rows)
    table_years = {}
    year_days = {}
    for key, meta in YEARS.items():
        chosen = slice_year(days, meta["start"], meta["end"])
        year_days[key] = chosen
        lengths: dict[str, int] = {}
        for day in chosen:
            lengths[str(len(day["prices"]))] = lengths.get(str(len(day["prices"])), 0) + 1
        if set(lengths) - {"92", "96", "100"}:
            raise SystemExit(f"unexpected day lengths {lengths}")
        print(f"solve {key} ({lengths})", flush=True)
        values, month_days = accumulate(chosen)
        check_shape(values, key)
        if sum(month_days) != 365:
            raise SystemExit("month days do not sum to 365")
        write_prices(f"prices-{key}.json", chosen)
        table_years[key] = {
            "label": meta["label"],
            "start": meta["start"].isoformat(),
            "end": meta["end"].isoformat(),
            "days": 365,
            "monthDays": month_days,
            "slotLengths": lengths,
            "values": round_values(values),
        }
        print(f"  months days {month_days}", flush=True)

    window = year_days["12m"]
    print("reference days", flush=True)
    for day_key, expect in REFERENCE_DAYS.items():
        day = next(item for item in window if item["date"] == day_key)
        got = solve_power([day], 103.5, 238.5, 103.5)
        for limit, target in expect.items():
            if target is None:
                continue
            value = solve_power([day], 103.5, 238.5, limit)[0]
            delta = value - target
            print(f"  {day_key} G={limit}: {value:.2f} target {target} delta {delta:.2f}", flush=True)
            if abs(delta) > 1.0:
                raise SystemExit(f"reference day {day_key} G={limit} off by {delta}")
        del got

    print("year sums", flush=True)
    year_exact = {}
    for limit, target in YEAR_SUMS.items():
        total = sum(solve_power(window, 103.5, 238.5, limit))
        year_exact[str(limit)] = round(total, 2)
        print(f"  G={limit}: {total:.2f} target {target} delta {total - target:.2f}", flush=True)
        if abs(total - target) > 1.0:
            raise SystemExit(f"year sum G={limit} off by {total - target}")

    exact_days = solve_power(window, 103.5, 2.304 * 103.5, 0.37 * 103.5)
    exact = sum(exact_days)
    grid = np.asarray(table_years["12m"]["values"], dtype=float)
    interpolated = float(bilinear(grid, 0, 2.304, 0.37).sum() * 103.5)
    relative = (interpolated - exact) / exact
    print(f"interpolation exact {exact:.2f} grid {interpolated:.2f} relative {relative:.4%}", flush=True)
    if abs(relative) >= 0.01:
        raise SystemExit("interpolation error is 1% or more")

    # Seasonal shares at the example storage, full limit, for the method text.
    daily = solve_power(window, 103.5, 238.5, 103.5)
    by_month = [0.0] * 12
    for day, value in zip(window, daily):
        by_month[int(day["date"][5:7]) - 1] += value
    year_total = sum(by_month)
    shares = [round(100 * value / year_total, 1) for value in by_month]
    print("shares", shares, flush=True)

    table = {
        "schemaVersion": 1,
        "retrieved": RETRIEVED,
        "source": {
            "name": "Energy-Charts DE-LU (Bundesnetzagentur | SMARD.de)",
            "license": "CC BY 4.0",
            "href": "https://api.energy-charts.info/v2/price?bzn=DE-LU",
            "note": "Kalenderjahr 2025 bis 30.09.2025 stündlich (vier gleiche Viertelstunden), danach viertelstündlich.",
        },
        "roundTripEfficiency": 0.85,
        "eta": round(ETA, 10),
        "hours": HOURS,
        "limits": LIMITS,
        "forms": list(FORMS),
        "horizonMonths": 36,
        "years": table_years,
        "checks": {
            "interpolation": {
                "year": "12m",
                "form": "fest",
                "hours": 2.304,
                "limit": 0.37,
                "powerMw": 103.5,
                "exactEur": round(exact, 2),
                "interpolatedEur": round(interpolated, 2),
                "relativeError": round(relative, 6),
            },
            "exampleYearEur": year_exact,
            "exampleMonthSharePct": shares,
        },
    }
    encoded = json.dumps(table, separators=(",", ":"), ensure_ascii=False)
    for directory in (OUT_DIR, PUBLIC_DIR):
        path = directory / "fca-table.json"
        path.write_text(encoded, encoding="utf-8")
        print(f"wrote {path} ({path.stat().st_size} bytes)", flush=True)
    # The raw feed is only a build cache.
    if raw_path.exists():
        raw_path.unlink()


if __name__ == "__main__":
    main()
