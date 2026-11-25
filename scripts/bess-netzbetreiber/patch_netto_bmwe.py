"""PR #152 Runde 2: bundle.json auf netto (Zubau 2026, G3) und Abregelung auf BMWE umstellen.

- Zubau 2026 und G3-Stapel zusätzlich in Nettonennleistung aus dem MaStR-Rohabruf
  24.11.2026 18:39 MEZ (gleiche Filter und Buckets wie build_static_data.py; Brutto wird
  gegen das bestehende Bundle geprüft).
- scatterBundeslaender: EE-Redispatch 2025 aus der BMWE-Antwort 12.05.2026 (BT-Drs. 21/5933,
  Frage 70) aus dem speicherpilot-Export karte3d.json. eeRedispatch2025Gwh = ohne Wind Offshore
  (Gesamt minus abregelung2025OffshoreGwh, zusammen 6.036,02 GWh), dazu gesamt und offshore.
  HH/BE k. A. = null. Die SMARD-Reihe s-nepm_baet misst einen anderen Umfang und wird entfernt.

Der Export ersetzt dieses Skript nicht: bundle.json ist ein eigenes Artefakt aus
build_static_data.py (Netzbetreiber-Buckets, Zubau, Scatter). Idempotent, läuft auf dem
bestehenden Bundle.

Aufruf: python3 scripts/bess-netzbetreiber/patch_netto_bmwe.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import build_static_data as m  # noqa: E402

ROH = Path("/workspace/speicherpilot/forschung/bess-karte-vnb/mastr_rohabruf_20261124_1839.json")
BUNDLE = ROOT / "data" / "bess-netzbetreiber" / "bundle.json"
KARTE = ROOT / "data" / "bess-karte-3d" / "karte3d.json"
MANIFEST = ROOT / "data" / "bess-netzbetreiber" / "manifest.json"
BMWE_NAME = ("Antwort der Bundesregierung (BMWE, StS Frank Wetzel) vom 12.05.2026 auf Schriftliche Frage 70, "
             "BT-Drucksache 21/5933, S. 43–44; Redispatch-Maßnahmen mit EE 2025, Karte ohne Wind Offshore")
BMWE_URL = "https://dserver.bundestag.de/btd/21/059/2105933.pdf"


def mw(row: dict, field: str) -> float:
    return float(row.get(field) or 0) / 1000


def zubau(rows: list[dict]) -> dict:
    acc = {"all": [0.0, 0.0], "eon": [0.0, 0.0], "eonOhne": [0.0, 0.0]}
    for r in rows:
        inb = m.parse_mastr_date(r.get("InbetriebnahmeDatum"))
        if not inb or int(inb[:4]) < 2026:
            continue
        b, n = mw(r, "Bruttoleistung"), mw(r, "Nettonennleistung")
        snb = m.extract_snb(r)
        for key, hit in (("all", True), ("eon", snb in m.EON_SNB_IDS), ("eonOhne", snb in m.EON_SNB_WITHOUT_MITNETZ)):
            if hit:
                acc[key][0] += b
                acc[key][1] += n
    return acc


def growth_netto(rows: list[dict]) -> dict:
    keys = ("eon_kern", "mitnetz_envia", "ewe_netz", "vnb_rest", "uenb")
    acc = {k: {"vor2026NettoMw": 0.0, "y2026NettoMw": 0.0} for k in keys}
    for r in rows:
        bucket_key, _, op = m.bucket_for_row(r)
        inb = m.parse_mastr_date(r.get("InbetriebnahmeDatum"))
        if not inb:
            continue
        k = ("uenb" if op == "uenb" else "mitnetz_envia" if bucket_key == "mitnetz_envia"
             else "eon_kern" if bucket_key.startswith("eon") else "ewe_netz" if bucket_key == "ewe_netz" else "vnb_rest")
        acc[k]["y2026NettoMw" if int(inb[:4]) >= 2026 else "vor2026NettoMw"] += mw(r, "Nettonennleistung")
    acc["eon_gruppe"] = {
        f: acc["eon_kern"][f] + acc["mitnetz_envia"][f] for f in ("vor2026NettoMw", "y2026NettoMw")
    }
    return {k: {f: round(v, 3) for f, v in d.items()} for k, d in acc.items()}


def main() -> None:
    rows = json.loads(ROH.read_text(encoding="utf-8"))["Data"]
    bundle = json.loads(BUNDLE.read_text(encoding="utf-8"))
    karte = json.loads(KARTE.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    for hs_key, growth_keys, quality in (
        ("headlineStats", ("growthDefault", "growthEonKern"), False),
        ("headlineStatsQualityFiltered", ("growthQualityFiltered",), True),
    ):
        filtered, _ = m.filter_rows(rows, apply_quality_filter=quality)
        z = zubau(filtered)
        hs = bundle[hs_key]["zubau2026"]
        if abs(round(z["all"][0], 1) - hs["allBruttoMw"]) > 0.05 or abs(round(z["eon"][0], 1) - hs["eonWithMitnetzBruttoMw"]) > 0.05:
            raise SystemExit(f"{hs_key}: Brutto weicht vom Bundle ab ({z['all'][0]:.1f} vs {hs['allBruttoMw']})")
        all_n, eon_n, ohne_n = z["all"][1], z["eon"][1], z["eonOhne"][1]
        hs.update({
            "allNettoMw": round(all_n, 1),
            "eonWithMitnetzNettoMw": round(eon_n, 1),
            "eonWithoutMitnetzNettoMw": round(ohne_n, 1),
            "eonSharePctNetto": round(eon_n / all_n * 100, 0) if all_n else 0,
            "eonSharePctWithoutMitnetzNetto": round(ohne_n / all_n * 100, 0) if all_n else 0,
        })
        gn = growth_netto(filtered)
        for gk in growth_keys:
            for bucket, vals in gn.items():
                if bucket in bundle[gk]:
                    bundle[gk][bucket].update(vals)

    bmwe = {b["bundesland"]: b for b in karte["bundeslaender"]}
    total = sum(b["abregelung2025Gwh"] or 0 for b in bmwe.values())
    off_total = sum(b.get("abregelung2025OffshoreGwh") or 0 for b in bmwe.values())
    if round(total, 2) != 9387.08 or round(off_total, 2) != 3351.06 or sum(b["abregelung2025Gwh"] is not None for b in bmwe.values()) != 14:
        raise SystemExit(f"BMWE-Werte unerwartet: {total:.2f} / Offshore {off_total:.2f} GWh")
    for sk in ("scatterBundeslaender", "scatterQualityFiltered"):
        for row in bundle.get(sk) or []:
            b = bmwe[row["bundesland"]]
            ges, off = b["abregelung2025Gwh"], b.get("abregelung2025OffshoreGwh")
            row["eeRedispatch2025Gwh"] = None if ges is None else round(ges - (off or 0), 2)
            row["eeRedispatch2025GesamtGwh"] = ges
            row["eeRedispatch2025OffshoreGwh"] = off
            row["abregelungQuelle"] = "BMWE 12.05.2026, BT-Drs. 21/5933, ohne Wind Offshore"
            if sk == "scatterBundeslaender":
                row["bessNettoGw"] = round(b["nettoMw"] / 1000, 3)

    bmwe_src = {"name": BMWE_NAME, "license": "amtliches Werk (§ 5 Abs. 2 UrhG)", "retrieved": "2026-05-12", "url": BMWE_URL}
    for target in (bundle["manifest"], manifest):
        srcs = [x for x in target.get("sources", []) if "SMARD" not in x.get("name", "") and "BMWE" not in x.get("name", "")]
        srcs.append(bmwe_src)
        target["sources"] = srcs
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    BUNDLE.write_text(json.dumps(bundle, ensure_ascii=False), encoding="utf-8")
    hs = bundle["headlineStats"]["zubau2026"]
    print("Zubau 2026 netto", hs["allNettoMw"], "E.ON", hs["eonWithMitnetzNettoMw"], f"{hs['eonSharePctNetto']:.0f} %",
          "| BMWE", round(total, 2), "GWh, ohne Offshore", round(total - off_total, 2))


if __name__ == "__main__":
    main()
