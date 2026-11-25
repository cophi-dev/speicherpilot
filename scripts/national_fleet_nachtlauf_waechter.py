#!/usr/bin/env python3
"""Prüft, ob /tag/{vortag} Kapitel 03 der Referenzflotte hat.

Referenzflotte = Repo-Stufe ×2 (Zusatzflotte 4,6 GW) plus
data/auffaelligkeit-woche/tage/{vortag}.json (Euro und lexikografischer Spitzen-Fahrplan).
×1-Dateien sind der Ist ohne Zusatzflotte und bleiben leer — sie reichen nicht.

Keine Solver-Abhängigkeiten, damit der Alert-Job vor 08:00 Europe/Berlin leicht bleibt.
Exit 1, wenn Dateien fehlen — das ist der Alert (GitHub-Actions-Mail an Watcher).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BERLIN = ZoneInfo("Europe/Berlin")

CHAPTER03_X2_FILES = (
    "x2_min_peak_perfect_foresight.json",
    "x2_price_oriented_da_arbitrage.json",
    "x2_surplus_wind_solar_over_load.json",
)


def berlin_yesterday(now: datetime | None = None) -> str:
    stamp = now or datetime.now(tz=BERLIN)
    return (stamp - timedelta(days=1)).date().isoformat()


def yesterday_chapter03_paths(day: str, root: Path = ROOT) -> list[Path]:
    base = root / "data/national-fleet" / day[:7] / "days" / day
    week = root / "data/auffaelligkeit-woche/tage" / f"{day}.json"
    return [base / name for name in CHAPTER03_X2_FILES] + [week]


def check_yesterday_chapter03(day: str | None = None, root: Path = ROOT) -> list[str]:
    target = day or berlin_yesterday()
    errors: list[str] = []
    paths = yesterday_chapter03_paths(target, root)
    week = paths[-1]
    for path in paths:
        try:
            rel = path.relative_to(root)
        except ValueError:
            rel = path
        if not path.exists():
            errors.append(f"fehlt: {rel}")
            continue
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"ungültiges JSON: {rel} ({exc})")
            continue
        if path == week:
            if doc.get("schema") != "auffaelligkeit-woche/1":
                errors.append(f"falsches Schema: {rel}")
            if doc.get("dateBerlin") != target:
                errors.append(f"falsches Datum: {rel} dateBerlin={doc.get('dateBerlin')!r}")
            continue
        if doc.get("factor") not in (2, "2"):
            errors.append(f"keine Referenzflotte (×2): {rel}")
        if doc.get("horizon") != "day":
            errors.append(f"kein Tageshorizont: {rel} horizon={doc.get('horizon')!r}")
    return errors


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--yesterday", action="store_true", help="Berliner Vortag (Default)")
    ap.add_argument("--day", help="festes Datum YYYY-MM-DD")
    args = ap.parse_args(argv)
    day = args.day or berlin_yesterday()
    errors = check_yesterday_chapter03(day)
    if errors:
        print(f"ALERT Kapitel 03 fehlt für {day}:", file=sys.stderr)
        for line in errors:
            print(line, file=sys.stderr)
        print(
            "Nachtlauf vor 08:00 Europe/Berlin nachziehen (workflow_dispatch) "
            "oder Ursache im Log von national-fleet-nachtlauf klären.",
            file=sys.stderr,
        )
        return 1
    print(f"Kapitel 03 Referenzflotte vorhanden für {day} (x2 + Wochen-Datei)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
