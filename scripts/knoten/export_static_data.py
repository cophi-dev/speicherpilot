#!/usr/bin/env python3
"""Export model results (tage_*.csv, kurven_*.json, meta_*.json) into data/knoten/ for Next.js."""
from __future__ import annotations

import csv
import json
import math
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SRC = Path(os.environ.get("KNOTEN_ERGEBNISSE", ROOT.parent.parent / "cursor/stores/bot/sp_knoten_v1/ergebnisse"))
if not DEFAULT_SRC.is_dir():
    DEFAULT_SRC = Path(__file__).resolve().parent / "ergebnisse"
OUT = ROOT / "data" / "knoten"

BELEGUNG = {
    "voll": ("haupt", 1.0),
    "reserve": ("reserve10", 0.9),
    "ueber": ("ueberbelegt125", 1.25),
}


def rnd(xs: list[float], nd: int = 3) -> list[float]:
    return [round(float(x), nd) for x in xs]


def export_belegung(key: str, tag: str) -> None:
    src = DEFAULT_SRC
    tage_path = src / f"tage_{tag}.csv"
    kurven_path = src / f"kurven_{tag}.json"
    meta_path = src / f"meta_{tag}.json"
    summe_path = src / f"summe_{tag}.csv"
    for p in (tage_path, kurven_path, meta_path, summe_path):
        if not p.is_file():
            raise SystemExit(f"missing {p}")

    dest = OUT / key
    curves_root = dest / "curves"
    curves_root.mkdir(parents=True, exist_ok=True)

    days: list[dict] = []
    with tage_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            r_markt = float(row["R_markt"])
            r_knoten = float(row["R_knoten"])
            verlust = ((r_markt - r_knoten) / r_markt * 100) if r_markt > 1e-6 else 0.0
            days.append(
                {
                    "saison": row["saison"],
                    "node": row["node"],
                    "k": int(row["k"]),
                    "day": row["day"],
                    "qhBase": int(row["qh_base"]),
                    "qhMarkt": int(row["qh_markt"]),
                    "qhKnoten": int(row["qh_knoten"]),
                    "mwhMarkt": round(float(row["mwh_markt"]), 3),
                    "rMarkt": round(r_markt, 2),
                    "rKnoten": round(r_knoten, 2),
                    "verlustPct": round(verlust, 2),
                    "pMw": round(float(row["P"]), 3),
                    "eMwh": round(float(row["E"]), 3),
                }
            )

    with open(dest / "days.json", "w", encoding="utf-8") as f:
        json.dump(days, f, ensure_ascii=False, separators=(",", ":"))

    summaries: list[dict] = []
    with summe_path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rm = float(row["Rm"])
            rk = float(row["Rk"])
            summaries.append(
                {
                    "saison": row["saison"],
                    "node": row["node"],
                    "k": int(row["k"]),
                    "tage": int(row["tage"]),
                    "qhBase": int(row["qh_base"]),
                    "qhMarkt": int(row["qh_markt"]),
                    "qhKnoten": int(row["qh_knoten"]),
                    "tageKonflikt": int(row["tage_konflikt"]),
                    "verlustPct": round(float(row["verlust_pct"]), 2),
                    "pMw": round(float(row["P"]), 3),
                    "eMwh": round(float(row["E"]), 3),
                }
            )

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta_out = {
        "belegung": key,
        "headroom": BELEGUNG[key][1],
        "limitMw": meta.get("L", 80.0),
        "peakNatMw": meta.get("peak_nat_mw"),
        "share": meta.get("share"),
        "nodes": meta.get("nodes"),
        "summaries": summaries,
    }
    with open(dest / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta_out, f, ensure_ascii=False, indent=2)

    kurven = json.loads(kurven_path.read_text(encoding="utf-8"))
    n_files = 0
    for ck, v in kurven.items():
        saison, node, k, day = ck.split("|")
        curve_dir = curves_root / saison / node / str(k)
        curve_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "base": rnd(v["base"]),
            "fm": rnd(v["fm"]),
            "fk": rnd(v["fk"]),
        }
        out_path = curve_dir / f"{day}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        n_files += 1

    print(f"{key}: {len(days)} day rows, {n_files} curve files → {dest}")


def main() -> None:
    global DEFAULT_SRC
    if len(sys.argv) > 1:
        DEFAULT_SRC = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "belegungen": list(BELEGUNG.keys()),
        "limitMw": 80.0,
        "factors": [1, 2, 5, 10],
        "nodes": ["wind", "solar", "stadt"],
        "dateRanges": {
            "herbst": ["2026-10-01", "2026-11-17"],
            "sommer": ["2026-06-01", "2026-07-31"],
        },
        "defaultFactor": 2,
        "defaultBelegung": "voll",
        "defaultNode": "wind",
        "defaultDay": "2026-10-24",
    }
    for key, (tag, _) in BELEGUNG.items():
        export_belegung(key, tag)
    with open(OUT / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"manifest → {OUT / 'manifest.json'}")


if __name__ == "__main__":
    main()