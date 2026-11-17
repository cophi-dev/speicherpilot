#!/usr/bin/env python3
"""Täglicher National-Fleet-Batch: TAGESHORIZONT (12 Läufe) + optional MONATSHORIZONT."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.parse
from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "artifacts/october-storage-counterfactual-20261107"))

from national_fleet_http import urlopen_json as _urlopen_json  # noqa: E402

from mip_month import DT_H, MonthStorageMip  # noqa: E402

BASE_POWER_MW = 4_644.09022
BASE_ENERGY_MWH = 8_152.4588
MODEL_FLEET = {
    "basePowerMw": BASE_POWER_MW,
    "baseEnergyMwh": BASE_ENERGY_MWH,
    "asOfBerlin": "2026-10-31",
    "source": "battery-charts Großspeicher",
    "labelDe": "4,64 GW / 8,15 GWh",
    "convention": "Zusatzflotte ×k = (k−1)× Basis",
}

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


def berlin_day_utc_window(day: str) -> tuple[str, str]:
    """Energy-Charts: Berlin-Kalendertag als UTC-Fenster (00:00–23:45 Europe/Berlin)."""
    day_start = datetime.fromisoformat(f"{day}T00:00:00").replace(tzinfo=BERLIN)
    day_end = datetime.fromisoformat(f"{day}T23:45:00").replace(tzinfo=BERLIN)
    start_utc = day_start.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_utc = day_end.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    return start_utc, end_utc


def expected_quarters_for_berlin_day(day: str) -> int:
    day_start = datetime.fromisoformat(f"{day}T00:00:00").replace(tzinfo=BERLIN)
    next_d = day_start.date() + timedelta(days=1)
    next_start = datetime(next_d.year, next_d.month, next_d.day, 0, 0, 0, tzinfo=BERLIN)
    return int((next_start - day_start).total_seconds() // 900)


def fetch_day_slots(day: str) -> list[dict]:
    start_utc, end_utc = berlin_day_utc_window(day)
    q = urllib.parse.urlencode({"country": "de", "start": start_utc, "end": end_utc})
    url = f"https://api.energy-charts.info/total_power?{q}"
    data = _urlopen_json(url)
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
                "day_ahead_eur_mwh": float("nan"),
            }
        )
    expected = expected_quarters_for_berlin_day(day)
    if len(slots) != expected:
        raise RuntimeError(f"{day}: {len(slots)} Viertelstunden, erwartet {expected}")
    if len(slots) < 90:
        raise RuntimeError(f"{day}: nur {len(slots)} Viertelstunden (unvollständig)")
    return slots


def fetch_day_ahead_prices(day: str) -> dict[str, float]:
    q = urllib.parse.urlencode({"bzn": "DE-LU", "start": day, "end": day})
    url = f"https://api.energy-charts.info/v2/price?{q}"
    envelope = _urlopen_json(url)
    by_ts: dict[str, float] = {}
    for row in envelope.get("data") or []:
        ts = row.get("timestamp")
        values = row.get("values") or {}
        price = values.get("day_ahead_price")
        if ts and price is not None and np.isfinite(float(price)):
            by_ts[str(ts)] = float(price)
    return by_ts


def attach_prices(slots: list[dict], by_ts: dict[str, float]) -> tuple[int, int]:
    """Returns (matched, total). Unmatched stay NaN."""
    matched = 0
    for slot in slots:
        p = by_ts.get(slot["timestamp_berlin"])
        if p is None:
            # ISO offsets may differ — match on HH:MM within day
            hm = slot["timestamp_berlin"][11:16]
            for k, v in by_ts.items():
                if k[11:16] == hm and k[:10] == slot["timestamp_berlin"][:10]:
                    p = v
                    break
        if p is not None:
            slot["day_ahead_eur_mwh"] = p
            matched += 1
    return matched, len(slots)


def market_prices_ok(slots: list[dict], min_coverage: float = 0.9) -> bool:
    prices = [s["day_ahead_eur_mwh"] for s in slots]
    ok = [p for p in prices if np.isfinite(p)]
    return len(ok) >= min_coverage * len(prices) and max(ok, default=0) > 0.01


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


def run_json(
    slots: list[dict],
    factor: int,
    strategy: str,
    horizon: str,
    day: str,
    *,
    as_of_berlin: str | None = None,
    month_final: bool = False,
    source_sha256: str = "",
) -> dict:
    c, d, e = solve_day(slots, factor, strategy)
    r = np.array([s["residual_mw"] for s in slots])
    rp = r + c - d
    month_key = day[:7] if len(day) >= 7 else day
    as_of = as_of_berlin or (day if horizon == "day" else month_key)
    return {
        "horizon": horizon,
        "dateBerlin": day if horizon == "day" else month_key,
        "asOfBerlin": as_of,
        "factor": factor,
        "strategySlug": strategy,
        "strategyUi": STRATEGY_UI[strategy],
        "sourceSha256": source_sha256,
        "intervalCount": len(slots),
        "timestamp_berlin": [s["timestamp_berlin"] for s in slots],
        "c_mw": [float(x) for x in c],
        "d_mw": [float(x) for x in d],
        "e_start_mwh": [float(e[i]) for i in range(len(c))],
        "e_end_mwh": [float(e[i + 1]) for i in range(len(c))],
        "r_mw": [float(x) for x in r],
        "r_prime_mw": [float(x) for x in rp],
        "day_ahead_eur_mwh": [float(v) if np.isfinite(v) else 0.0 for v in (s["day_ahead_eur_mwh"] for s in slots)],
        "modelFleet": MODEL_FLEET,
        "provenance": {
            "horizonLabel": "MONATSHORIZONT" if horizon == "month" else "TAGESHORIZONT",
            "asOfBerlin": as_of,
            **({"monthFinal": month_final} if horizon == "month" else {}),
            "socStartEndFraction": 0.5,
            "lexPeakFlat": strategy == "min_peak_perfect_foresight",
            "solver": "MonthStorageMip",
            "generatedAt": datetime.now(tz=BERLIN).isoformat(),
        },
    }


def day_inputs_path(day: str) -> Path:
    return ROOT / "data/national-fleet" / day[:7] / "days" / day / "_inputs.json"


def write_day_inputs(day: str, slots: list[dict]) -> None:
    write_idempotent(day_inputs_path(day), {"dateBerlin": day, "slots": slots})


def read_day_inputs(day: str) -> list[dict] | None:
    path = day_inputs_path(day)
    if not path.exists():
        return None
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
        slots = doc.get("slots") or []
    except (json.JSONDecodeError, OSError):
        return None
    if len(slots) < 90:
        return None
    return slots


def day_stats_from_slots(slots: list[dict]) -> dict:
    matched = sum(1 for s in slots if np.isfinite(s.get("day_ahead_eur_mwh", float("nan"))))
    return {
        "matchedQuarters": matched,
        "totalQuarters": len(slots),
        "marketOk": market_prices_ok(slots),
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


def run_day(day: str) -> tuple[dict, list[dict]]:
    slots = fetch_day_slots(day)
    time.sleep(1.5)
    prices_by_ts = fetch_day_ahead_prices(day)
    matched, total = attach_prices(slots, prices_by_ts)
    write_day_inputs(day, slots)
    market_ok = market_prices_ok(slots)
    if not market_ok:
        print(
            f"WARN {day}: Day-Ahead unvollständig ({matched}/{total} Viertelstunden) — "
            "Markt-Fahrweise wird nicht geschrieben",
            file=sys.stderr,
        )

    month = day[:7]
    out_root = ROOT / "data/national-fleet" / month / "days" / day
    out_root.mkdir(parents=True, exist_ok=True)
    manifest: dict = {
        "horizon": "day",
        "dateBerlin": day,
        "modelFleet": MODEL_FLEET,
        "dayAhead": {"matchedQuarters": matched, "totalQuarters": total, "marketOk": market_ok},
        "runs": {},
        "skipped": [],
        "generatedAt": datetime.now(tz=BERLIN).isoformat(),
    }
    strategies = list(STRATEGIES) if market_ok else [s for s in STRATEGIES if s != "price_oriented_da_arbitrage"]
    if not market_ok:
        manifest["skipped"].append(
            {
                "strategy": "price_oriented_da_arbitrage",
                "reason": "day_ahead_eur_mwh nicht verfügbar oder unvollständig",
            }
        )
        for factor in FACTORS:
            stale = out_root / f"x{factor}_price_oriented_da_arbitrage.json"
            if stale.exists():
                stale.unlink()

    for factor in FACTORS:
        for strategy in strategies:
            doc = run_json(slots, factor, strategy, "day", day)
            name = f"x{factor}_{strategy}.json"
            path = out_root / name
            write_idempotent(path, doc)
            manifest["runs"][name] = {
                "path": str(path.relative_to(ROOT)),
                "sha256": sha256_bytes(json.dumps(doc, sort_keys=True).encode()),
            }
    manifest_path = out_root.parent / f"manifest-{day}.json"
    write_idempotent(manifest_path, manifest)
    return manifest, slots


def last_day_of_month(month_key: str) -> str:
    y, m = int(month_key[:4]), int(month_key[5:7])
    if m == 12:
        nxt = datetime(y + 1, 1, 1, tzinfo=BERLIN).date()
    else:
        nxt = datetime(y, m + 1, 1, tzinfo=BERLIN).date()
    return (nxt - timedelta(days=1)).isoformat()


def is_month_final(as_of: str) -> bool:
    return as_of == last_day_of_month(as_of[:7])


def collect_slots_range(
    date_from: str,
    date_to: str,
    *,
    sleep_s: float = 1.5,
    seed_slots: dict[str, list[dict]] | None = None,
) -> tuple[list[dict], dict]:
    """Viertelstunden vom ersten bis letzten Berlin-Tag (inkl.), mit Day-Ahead."""
    start = datetime.fromisoformat(date_from).date()
    end = datetime.fromisoformat(date_to).date()
    if end < start:
        raise ValueError(f"date_to {date_to} vor date_from {date_from}")
    all_slots: list[dict] = []
    day_stats: dict[str, dict] = {}
    seeded = seed_slots or {}
    d = start
    first = True
    while d <= end:
        day = d.isoformat()
        if not first:
            time.sleep(sleep_s)
        first = False
        slots = seeded.get(day) or read_day_inputs(day)
        if slots is not None:
            day_stats[day] = day_stats_from_slots(slots)
        else:
            slots = fetch_day_slots(day)
            time.sleep(sleep_s)
            prices_by_ts = fetch_day_ahead_prices(day)
            matched, total = attach_prices(slots, prices_by_ts)
            write_day_inputs(day, slots)
            day_stats[day] = {
                "matchedQuarters": matched,
                "totalQuarters": total,
                "marketOk": market_prices_ok(slots),
            }
        all_slots.extend(slots)
        d += timedelta(days=1)
    if len(all_slots) < 90:
        raise RuntimeError(f"Monatsfenster {date_from}…{date_to}: nur {len(all_slots)} Viertelstunden")
    return all_slots, day_stats


def month_input_sha256(slots: list[dict]) -> str:
    parts = [s["timestamp_berlin"] + f":{s['residual_mw']:.3f}" for s in slots]
    return sha256_bytes("\n".join(parts).encode())


def run_month(month_key: str, as_of: str, slots: list[dict], day_stats: dict) -> dict:
    month_market_ok = all(v.get("marketOk") for v in day_stats.values())
    if not month_market_ok:
        print(
            f"WARN Monat {month_key} asOf={as_of}: Day-Ahead lücken — Markt-Fahrweise wird nicht geschrieben",
            file=sys.stderr,
        )
    strategies = list(STRATEGIES) if month_market_ok else [s for s in STRATEGIES if s != "price_oriented_da_arbitrage"]
    month_final = is_month_final(as_of)
    out_runs = ROOT / "data/national-fleet" / month_key / "runs"
    out_runs.mkdir(parents=True, exist_ok=True)
    source_sha = month_input_sha256(slots)
    manifest: dict = {
        "monthKey": month_key,
        "horizon": "month",
        "asOfBerlin": as_of,
        "monthFinal": month_final,
        "intervalCount": len(slots),
        "rangeBerlin": {"from": f"{month_key}-01", "to": as_of},
        "modelFleet": MODEL_FLEET,
        "dayAheadByDay": day_stats,
        "runs": {},
        "skipped": [],
        "generatedAt": datetime.now(tz=BERLIN).isoformat(),
    }
    if not month_market_ok:
        manifest["skipped"].append(
            {
                "strategy": "price_oriented_da_arbitrage",
                "reason": "day_ahead_eur_mwh nicht vollständig im Monatsfenster",
            }
        )
        for factor in FACTORS:
            stale = out_runs / f"x{factor}_price_oriented_da_arbitrage.json"
            if stale.exists():
                stale.unlink()

    for factor in FACTORS:
        for strategy in strategies:
            doc = run_json(
                slots,
                factor,
                strategy,
                "month",
                month_key,
                as_of_berlin=as_of,
                month_final=month_final,
                source_sha256=source_sha,
            )
            name = f"x{factor}_{strategy}.json"
            path = out_runs / name
            write_idempotent(path, doc)
            payload = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            manifest["runs"][name] = {
                "file": f"runs/{name}",
                "path": str(path.relative_to(ROOT)),
                "sha256": sha256_bytes(payload),
                "bytes": len(payload),
            }

    run_shards = {k: {"file": v["file"], "sha256": v["sha256"], "bytes": v["bytes"]} for k, v in manifest["runs"].items()}
    manifest["runShards"] = run_shards
    manifest_path = ROOT / "data/national-fleet" / month_key / "manifest.json"
    write_idempotent(manifest_path, manifest)
    return manifest


def run_night_batch(yesterday: str) -> dict:
    """Vortag · TAGESHORIZONT + rollierender / finaler MONATSHORIZONT."""
    t0 = time.perf_counter()
    day_manifest, y_slots = run_day(yesterday)
    month_key = yesterday[:7]
    month_from = f"{month_key}-01"
    t1 = time.perf_counter()
    slots, day_stats = collect_slots_range(month_from, yesterday, seed_slots={yesterday: y_slots})
    t2 = time.perf_counter()
    month_manifest = run_month(month_key, yesterday, slots, day_stats)
    t3 = time.perf_counter()
    timing = {
        "day_s": round(t1 - t0, 2),
        "month_fetch_s": round(t2 - t1, 2),
        "month_solve_s": round(t3 - t2, 2),
        "total_s": round(t3 - t0, 2),
    }
    return {
        "ok": True,
        "yesterday": yesterday,
        "day": day_manifest,
        "month": month_manifest,
        "timing": timing,
    }


def energy_balance_ok(doc: dict, tol: float = 0.1) -> tuple[bool, float]:
    from mip_month import ETA as MIP_ETA  # noqa: WPS433

    c = np.array(doc.get("c_mw") or [], dtype=float)
    d = np.array(doc.get("d_mw") or [], dtype=float)
    if len(c) != len(d) or len(c) == 0:
        return False, float("nan")
    _, e_nom = additional_fleet(int(doc.get("factor", 1)))
    charged = float(np.sum(MIP_ETA * c * DT_H))
    discharged = float(np.sum(d * DT_H / MIP_ETA))
    if doc.get("horizon") == "day":
        soc_delta = 0.0
    else:
        e_start = doc.get("e_start_mwh") or []
        e_end = doc.get("e_end_mwh") or []
        if not e_start or not e_end:
            return False, float("nan")
        soc_delta = float(e_end[-1]) - float(e_start[0])
    residue = charged - discharged - soc_delta
    return abs(residue) <= tol, residue


def validate_fleet_json(path: Path) -> list[str]:
    errs: list[str] = []
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"{path}: JSON {exc}"]
    horizon = doc.get("horizon")
    if horizon not in ("day", "month"):
        errs.append(f"{path}: horizon fehlt/ungültig")
        return errs
    if doc.get("intervalCount", 0) < 90:
        errs.append(f"{path}: intervalCount < 90")
    n = doc.get("intervalCount")
    for key in ("c_mw", "d_mw", "r_mw", "r_prime_mw", "timestamp_berlin"):
        if len(doc.get(key) or []) != n:
            errs.append(f"{path}: Länge {key} != intervalCount")
    if not doc.get("modelFleet"):
        errs.append(f"{path}: modelFleet fehlt")
    ok, residue = energy_balance_ok(doc)
    if not ok:
        errs.append(f"{path}: Energiebilanz Rest={residue}")
    return errs


def validate_paths(paths: list[Path]) -> int:
    errors: list[str] = []
    for path in paths:
        if path.suffix != ".json" or "national-fleet" not in path.as_posix():
            continue
        if path.name.startswith("manifest") or path.name.startswith("_"):
            continue
        errors.extend(validate_fleet_json(path))
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print(f"OK {len(paths)} Datei(en) geprüft", file=sys.stderr)
    return 0


def git_staged_fleet_files() -> list[Path]:
    import subprocess

    out = subprocess.check_output(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        cwd=ROOT,
        text=True,
    )
    names = [ln.strip() for ln in out.splitlines() if ln.strip().startswith("data/national-fleet/")]
    return [ROOT / n for n in names if n.endswith(".json")]


def git_changed_fleet_files() -> list[Path]:
    import subprocess

    out = subprocess.check_output(["git", "diff", "--name-only", "HEAD"], cwd=ROOT, text=True)
    unstaged = subprocess.check_output(["git", "diff", "--name-only"], cwd=ROOT, text=True)
    names = {ln.strip() for ln in (out + "\n" + unstaged).splitlines() if ln.strip().startswith("data/national-fleet/")}
    return [ROOT / n for n in sorted(names) if n.endswith(".json")]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--day", help="einzelner Berlin-Tag YYYY-MM-DD")
    ap.add_argument("--from", dest="date_from", help="Backfill von")
    ap.add_argument("--to", dest="date_to", help="Backfill bis")
    ap.add_argument("--yesterday", action="store_true", help="Vortag inkl. Tages- + Monatslauf")
    ap.add_argument("--month", metavar="YYYY-MM", help="Monat backfill bis --as-of")
    ap.add_argument("--as-of", dest="as_of", help="Stichtag Monats-Horizont (default: --to oder Vortag)")
    ap.add_argument("--month-only", action="store_true", help="Nur MONATSHORIZONT (ohne Tagesläufe)")
    ap.add_argument("--validate-git-diff", action="store_true", help="Plausibilität geänderter Fleet-JSON (working tree)")
    ap.add_argument("--validate-staged", action="store_true", help="Plausibilität gestagter Fleet-JSON (CI)")
    args = ap.parse_args()

    if args.validate_staged:
        paths = git_staged_fleet_files()
        if not paths:
            print("Keine gestagten data/national-fleet JSON", file=sys.stderr)
            return 0
        run_paths = [p for p in paths if "/runs/" in p.as_posix() or "/days/" in p.as_posix()]
        return validate_paths(run_paths)

    if args.validate_git_diff:
        paths = git_changed_fleet_files()
        if not paths:
            print("Keine geänderten data/national-fleet JSON", file=sys.stderr)
            return 0
        return validate_paths(paths)

    days: list[str] = []
    if args.yesterday:
        yesterday = berlin_yesterday()
        payload = run_night_batch(yesterday)
        json.dump(payload, sys.stdout, indent=2)
        print()
        return 0
    if args.day:
        days.append(args.day)
    if args.date_from and args.date_to:
        start = datetime.fromisoformat(args.date_from).date()
        end = datetime.fromisoformat(args.date_to).date()
        d = start
        while d <= end:
            days.append(d.isoformat())
            d += timedelta(days=1)
    if args.month:
        month_key = args.month
        as_of = args.as_of or (days[-1] if days else args.date_to) or berlin_yesterday()
        if as_of[:7] != month_key:
            raise SystemExit(f"--as-of {as_of} passt nicht zu --month {month_key}")
        t0 = time.perf_counter()
        slots, day_stats = collect_slots_range(f"{month_key}-01", as_of)
        t1 = time.perf_counter()
        month_manifest = run_month(month_key, as_of, slots, day_stats)
        timing = {"month_fetch_s": round(t1 - t0, 2), "month_solve_s": round(time.perf_counter() - t1, 2)}
        json.dump({"ok": True, "month": month_manifest, "timing": timing}, sys.stdout, indent=2)
        print()
        return 0

    if not days:
        days.append(berlin_yesterday())
    results = []
    month_ran: dict | None = None
    for i, day in enumerate(sorted(set(days))):
        if args.month_only:
            continue
        print(f"day {day} …", flush=True)
        if i > 0:
            time.sleep(1.25)
        manifest, _slots = run_day(day)
        results.append(manifest)
    if days and not args.month_only:
        as_of = sorted(set(days))[-1]
        month_key = as_of[:7]
        print(f"month {month_key} 01…{as_of} …", flush=True)
        slots, day_stats = collect_slots_range(f"{month_key}-01", as_of)
        month_ran = run_month(month_key, as_of, slots, day_stats)
    json.dump({"ok": True, "days": results, "month": month_ran}, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())