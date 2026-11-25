#!/usr/bin/env python3
"""Unabhängige Nachprüfung aus den JSON-Zeitreihen (ohne Löser): Erlös, Spitze, Energiebilanz, SoC."""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAGE = ROOT / "data" / "auffaelligkeit-woche" / "tage"
E = 8152.4588
P = 4644.09022
ETA = math.sqrt(0.85)
DT = 0.25
bad = 0
files = sorted(TAGE.glob("*.json"))
if not files:
    print(f"keine Tagesdateien in {TAGE}", file=sys.stderr)
    raise SystemExit(1)
for f in files:
    j = json.loads(f.read_text())
    z = j["zeitreihe"]
    R = z["restlastMw"]
    p = z["dayAheadEurMwh"]
    for k, fw in j["fahrweisen"].items():
        c, d, e = z[k]["c_mw"], z[k]["d_mw"], z[k]["e_mwh"]
        rev = sum((d[t] - c[t]) * p[t] * DT for t in range(len(R)))
        rp = [R[t] + c[t] - d[t] for t in range(len(R))]
        bal = max(abs(e[t + 1] - e[t] - ETA * c[t] * DT + d[t] * DT / ETA) for t in range(len(R)))
        abend = max(rp[t] for t, ts in enumerate(z["timestampBerlin"]) if "16:00" <= ts[11:16] < "21:00")
        ok = (
            abs(rev - fw["erloesEur"]) < 60
            and abs((max(R) - max(rp)) / 1e3 - fw["senkungGw"]) < 0.01
            and bal < 0.05
            and min(e) >= 0.1 * E - 0.1
            and max(e) <= 0.9 * E + 0.1
            and abs(e[0] - e[-1]) < 0.1
            and max(max(c), max(d)) <= P + 0.1
        )
        bad += not ok
        print(
            f.stem,
            k,
            "Erlös",
            round(rev),
            "Senkung",
            round((max(R) - max(rp)) / 1e3, 3),
            "Abend16-21 nachher GW",
            round(abend / 1e3, 3),
            "Bilanz",
            round(bal, 3),
            "OK" if ok else "FEHLER",
        )
sys.exit(1 if bad else 0)
