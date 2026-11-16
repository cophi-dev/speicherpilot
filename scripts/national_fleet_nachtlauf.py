#!/usr/bin/env python3
"""Täglicher National-Fleet-Batch: TAGESHORIZONT (12 Läufe) + optional MONATSHORIZONT."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "artifacts/october-storage-counterfactual-20261107"))

from mip_month import DT_H, MonthStorageMip  # noqa: E402

BASE_POWER_MW = 4_644.09022
BASE_ENERGY_MWH = 8_152.4588

BERLIN = ZoneInfo("Europe/Berlin")
FACTORS = (1, 2, 5, 10)
STRATEGIES = (
    "surplus_wind_solar_over_load",
    "min_peak_perfect_foresight",
    "price_oriented_da_arbitrage",
)
STRATEGY_UI = {
    "surplus_wind_solar_over_load": "ueberschuss",
    "min_peak_perfect_foresight": "spitze",
    "price_oriented_da_arbitrage": "markt",
}


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def berlin_yesterday() -> str:
    now = datetime.now(BERLIN)
    d = (now - timedelta(days=1)).date()
    return d.isoformat()


def _series(production_types: list, pattern: str) -> list:
    rx = re.compile(pattern, re.I)
    for pt in production_types:
        if rx.search(pt.get("name", "")):
            return pt.get("data") or []
    return []


def fetch_day_slots(day: str) -> list[dict]:
    start = f"{day}T00:00:00"
    end = f"{day}T23:59:59"
    q = urllib.parse.urlencode({"country": "de", "start": start, "end": end})
    url = f"https://api.energy-charts.info/total_power?{q}"
    with urllib.request.urlopen(url, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    unixes = data.get("unix_seconds") or []
    pts = data.get("production_types") or []
    load = _series(pts, r"load \(incl\. self-consumption\)")
    wind = _series(pts, r"wind onshore")
    woff = _series(pts, r"wind offshore")
    solar = _series(pts, r"^solar$")
    residual_row = _series(pts, r"^residual load")
    slots: list[dict] = []
    for i, ux in enumerate(unixes):
        ts = datetime.fromtimestamp(ux, tz=BERLIN).isoformat(timespec="seconds")
        if not ts.startswith(day):
            continue
        lm_v = load[i] if i < len(load) else None
        if lm_v is None:
            continue
        lm = float(lm_v)
        ws = float(
            (wind[i] if i < len(wind) and wind[i] is not None else 0)
            + (woff[i] if i < len(woff) and woff[i] is not None else 0)
            + (solar[i] if i < len(solar) and solar[i] is not None else 0)
        )
        if residual_row and i < len(residual_row) and residual_row[i] is not None:
            residual = float(residual_row[i])
        else:
            residual = lm - ws
        slots.append(
            {
                "timestamp_berlin": ts,
                "load_mw": lm,
                "wind_solar_mw": ws,
                "residual_mw": residual,
                "surplus_mw": max(0.0, ws - lm),
                "day_ahead_eur_mwh": 0.0,
            }
        )
    if len(slots) < 90:
        raise RuntimeError(f"{day}: nur {len(slots)} Viertelstunden (unvollständig)")
    return slots


def additional_fleet(factor: int) -> tuple[float, float]:
    add = max(0, factor - 1)
    return add * BASE_POWER_MW, add * BASE_ENERGY_MWH


def solve_day(slots: list[dict], factor: int, strategy: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    n = len(slots)
    residual = np.array([s["residual_mw"] for s in slots])
    surplus = np.array([s["surplus_mw"] for s in slots])
    prices = np.array([s["day_ahead_eur_mwh"] for s in slots])
    p, e_nom = additional_fleet(factor)
    if p <= 0:
        return np.zeros(n), np.zeros(n), np.full(n + 1, 0.5 * e_nom if e_nom > 0 else 0.0)
    if strategy == "min_peak_perfect_foresight":
        m = MonthStorageMip(n, p, e_nom)
        return m.solve_min_peak_flat(residual)[:3]
    if strategy == "surplus_wind_solar_over_load":
        m1 = MonthStorageMip(n, p, e_nom)
        c1, d1, e1, _ = m1.solve_surplus_capture_max(surplus, residual)
        floor = float(np.sum(c1) * DT_H) - 1e-3
        m2 = MonthStorageMip(n, p, e_nom)
        return m2.solve_surplus_capture_tiebreak_peak(surplus, residual, floor)[:3]
    m = MonthStorageMip(n, p, e_nom)
    return m.solve_price(prices)[:3]


def run_json(slots: list[dict], factor: int, strategy: str, horizon: str, day: str) -> dict:
    c, d, e = solve_day(slots, factor, strategy)
    r = np.array([s["residual_mw"] for s in slots])
    rp = r + c - d
    return {
        "horizon": horizon,
        "dateBerlin": day if horizon == "day" else day[:7],
        "factor": factor,
        "strategySlug": strategy,
        "strategyUi": STRATEGY_UI[strategy],
        "intervalCount": len(slots),
        "timestamp_berlin": [s["timestamp_berlin"] for s in slots],
        "c_mw": [float(x) for x in c],
        "d_mw": [float(x) for x in d],
        "e_start_mwh": [float(e[i]) for i in range(len(c))],
        "e_end_mwh": [float(e[i + 1]) for i in range(len(c))],
        "r_mw": [float(x) for x in r],
        "r_prime_mw": [float(x) for x in rp],
        "day_ahead_eur_mwh": [s["day_ahead_eur_mwh"] for s in slots],
        "provenance": {
            "lexPeakFlat": strategy == "min_peak_perfect_foresight",
            "solver": "MonthStorageMip",
            "generatedAt": datetime.now(tz=BERLIN).isoformat(),
        },
    }


def write_idempotent(path: Path, doc: dict) -> None:
    payload = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if path.exists():
        old = path.read_bytes()
        if hashlib.sha256(old).digest() == hashlib.sha256(payload).digest():
            return
        old_doc = json.loads(old.decode("utf-8"))
        if old_doc.get("intervalCount") and not doc.get("intervalCount"):
            raise RuntimeError(f"refuse empty overwrite: {path}")
    if doc.get("intervalCount") is not None and doc.get("intervalCount", 0) < 90:
        raise RuntimeError(f"refuse write <90 intervals: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(payload)
    tmp.replace(path)


def run_day(day: str) -> dict:
    slots = fetch_day_slots(day)
    month = day[:7]
    out_root = ROOT / "data/national-fleet" / month / "days" / day
    manifest: dict = {"horizon": "day", "dateBerlin": day, "runs": {}, "generatedAt": datetime.now(tz=BERLIN).isoformat()}
    for factor in FACTORS:
        for strategy in STRATEGIES:
            doc = run_json(slots, factor, strategy, "day", day)
            name = f"x{factor}_{strategy}.json"
            path = out_root / name
            write_idempotent(path, doc)
            manifest["runs"][name] = {"path": str(path.relative_to(ROOT)), "sha256": sha256_bytes(json.dumps(doc, sort_keys=True).encode())}
    manifest_path = out_root.parent / f"manifest-{day}.json"
    write_idempotent(manifest_path, manifest)
    return manifest


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--day", help="einzelner Berlin-Tag YYYY-MM-DD")
    ap.add_argument("--from", dest="date_from", help="Backfill von")
    ap.add_argument("--to", dest="date_to", help="Backfill bis")
    ap.add_argument("--yesterday", action="store_true")
    args = ap.parse_args()
    days: list[str] = []
    if args.yesterday:
        days.append(berlin_yesterday())
    if args.day:
        days.append(args.day)
    if args.date_from and args.date_to:
        start = datetime.fromisoformat(args.date_from).date()
        end = datetime.fromisoformat(args.date_to).date()
        d = start
        while d <= end:
            days.append(d.isoformat())
            d += timedelta(days=1)
    if not days:
        days.append(berlin_yesterday())
    results = []
    for day in sorted(set(days)):
        print(f"day {day} …", flush=True)
        results.append(run_day(day))
    json.dump({"ok": True, "days": results}, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())