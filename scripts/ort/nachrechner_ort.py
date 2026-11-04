#!/usr/bin/env python3
"""Stub verification for data/ort/ort-archetypes.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT / "data" / "ort" / "ort-archetypes.json"


def main(path: str | None = None) -> None:
    target = Path(path) if path else DEFAULT
    payload = json.loads(target.read_text(encoding="utf-8"))
    print(f"{'key':<6} {'typtag':<12} {'X':>5} {'Y':>5} {'t*':>3} {'conflict qh':>12} {'badge netz':>12}")
    for key in ("land", "stadt"):
        arch = payload["archetypes"][key]
        print(
            f"{key:<6} {arch['typtag']:<12} {arch['xMw']:>5.1f} {arch['yMw']:>5.1f} "
            f"{arch['tStar']:>3d} {arch['conflicts12m']['qh']:>12d} {arch['badge']['netz']:>12}"
        )


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
