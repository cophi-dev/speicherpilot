#!/usr/bin/env python3
"""Abgleich data/knoten gegen Referenz (Bundle 808717b4 = ohne Rampen-Tiebreak)."""
from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REF = "808717b4"
BELEG = ("voll", "reserve", "ueber")
KEYS = ("rMarkt", "rKnoten", "qhMarkt", "qhKnoten")


def load_days(key: str, ref: str | None) -> list[dict]:
    if ref:
        raw = subprocess.check_output(["git", "show", f"{ref}:data/knoten/{key}/days.json"], cwd=ROOT)
        return json.loads(raw)
    return json.loads((ROOT / f"data/knoten/{key}/days.json").read_text(encoding="utf-8"))


def main() -> None:
    rows_out = []
    max_delta = 0.0
    for key in BELEG:
        cur = {tuple(r[f] for f in ("day", "node", "k")): r for r in load_days(key, None)}
        ref = {tuple(r[f] for f in ("day", "node", "k")): r for r in load_days(key, REF)}
        for id_, r in sorted(cur.items()):
            day, node, k = id_
            b = ref.get(id_)
            if not b:
                rows_out.append({"belegung": key, "day": day, "node": node, "k": k, "status": "missing_ref"})
                continue
            deltas = {field: abs(float(r[field]) - float(b[field])) for field in KEYS if field in r and field in b}
            if any(deltas.values()):
                rows_out.append({"belegung": key, "day": day, "node": node, "k": k, **deltas, "status": "delta"})
            max_delta = max(max_delta, *deltas.values())
    md = ROOT / "docs" / "knoten" / "tiebreak_vor_nach.md"
    md.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Knoten-Datenabgleich (Referenz: main-Bundle vor R3-Tiebreak)",
        "",
        f"Referenz-Commit: `{REF}`. `main` enthält kein `data/knoten/`; die Referenz entspricht dem Bundle ohne Rampen-Tiebreak.",
        "",
        f"**Ergebnis:** {len([r for r in rows_out if r.get('status') == 'delta'])} Abweichungen, max. Delta {max_delta:.6g} (Ziel: 0).",
        "",
        "Stichprobe Konzepttage:",
        "",
        "| Belegung | Tag | Knoten | k | Δ R Markt | Δ R knoten | Δ qh Markt | Δ qh knoten |",
        "|----------|-----|--------|---|-----------|------------|------------|-------------|",
    ]
    sample = [
        ("voll", "2026-10-24", "wind", 5),
        ("voll", "2026-10-24", "wind", 2),
        ("voll", "2026-11-13", "stadt", 5),
    ]
    for beleg, day, node, k in sample:
        r = next((x for x in rows_out if x.get("day") == day and x.get("node") == node and x.get("k") == k), None)
        if r and r.get("status") == "delta":
            lines.append(
                f"| {beleg} | {day} | {node} | ×{k} | {r.get('rMarkt', 0)} | {r.get('rKnoten', 0)} | "
                f"{r.get('qhMarkt', 0)} | {r.get('qhKnoten', 0)} |"
            )
        else:
            lines.append(f"| {beleg} | {day} | {node} | ×{k} | 0 | 0 | 0 | 0 |")
    md.write_text("\n".join(lines) + "\n", encoding="utf-8")
    json_path = ROOT / "docs" / "knoten" / "main_abgleich.json"
    json_path.write_text(json.dumps({"max_delta": max_delta, "mismatches": rows_out[:50]}, indent=2), encoding="utf-8")
    print(md, "max_delta", max_delta)
    if rows_out:
        sys.exit(1 if max_delta > 1e-6 else 0)


if __name__ == "__main__":
    main()