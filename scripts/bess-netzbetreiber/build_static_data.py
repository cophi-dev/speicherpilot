#!/usr/bin/env python3
"""Build static data for /netzbetreiber (MaStR, SMARD Energiedaten kompakt, optional BKG VG250)."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "bess-netzbetreiber"
CACHE = Path(__file__).resolve().parent / "cache"

MASTR_URL = (
    "https://www.marktstammdatenregister.de/MaStR/Einheit/EinheitJson/"
    "GetErweiterteOeffentlicheEinheitStromerzeugung"
)
SMARD_CSV_URL = "https://www.smard.de/resource/blob/217306/-/data-csv-data.csv"

# SMARD Energiedaten kompakt: Wind onshore + PV columns (GWh per month row)
SMARD_RE_ET_COL_WIND_ON = 1
SMARD_RE_ET_COL_PV = 3

# SMARD s-nepm_baet-1-{n}: indices 1–16 = deutsche Bundesländer (Alphabet auf SMARD).
BUNDESLAENDER_DE = [
    "Baden-Württemberg",
    "Bayern",
    "Berlin",
    "Brandenburg",
    "Bremen",
    "Hamburg",
    "Hessen",
    "Mecklenburg-Vorpommern",
    "Niedersachsen",
    "Nordrhein-Westfalen",
    "Rheinland-Pfalz",
    "Saarland",
    "Sachsen",
    "Sachsen-Anhalt",
    "Schleswig-Holstein",
    "Thüringen",
]

PLZ_CENTROIDS: dict[str, tuple[float, float]] = {}

# E.ON-Konzern: feste MaStR-Nummern (ANSchluss-Netzbetreiber), nicht Namenssubstrings.
EON_SNB_BUCKETS: dict[str, tuple[str, str]] = {
    "SNB921897286493": ("eon_westnetz", "Westnetz"),
    "SNB940352624434": ("eon_bayernwerk", "Bayernwerk Netz"),
    "SNB990362338043": ("eon_avacon", "Avacon Netz GmbH"),
    "SNB990857029876": ("eon_sh_netz", "Schleswig-Holstein Netz"),
    "SNB941690671609": ("eon_edis", "E.DIS Netz"),
    "SNB911705062982": ("eon_lew", "LEW Verteilnetz"),
    "SNB918250928893": ("eon_syna", "Syna"),
    "SNB916269213931": ("mitnetz_envia", "MITNETZ / enviaM"),
    "SNB911641710114": ("eon_regionetz", "Regionetz"),
    "SNB976379598847": ("eon_energis", "energis Netzgesellschaft"),
}
EON_SNB_IDS = frozenset(EON_SNB_BUCKETS.keys())
EON_SNB_WITHOUT_MITNETZ = EON_SNB_IDS - {"SNB916269213931"}
EON_SNB_KERN = frozenset(
    snb
    for snb, (key, _) in EON_SNB_BUCKETS.items()
    if key not in ("mitnetz_envia", "eon_regionetz", "eon_energis")
)
EON_LEGACY_NAME_FALLBACK = (
    "westnetz",
    "bayernwerk",
    "avacon",
    "schleswig-holstein netz",
    "e.dis",
    "lew",
    "syna",
    "regionetz",
    "energis",
)

UNB_KEYWORDS = (
    "tennet",
    "amprion",
    "50hertz",
    "transnetbw",
    "transnet",
    "übertragungsnetz",
)

MIN_NET_KW = 1_000
NATURAL_PERSON_ART = 518
NB_PRUEFUNG_DONE = 2955


def http_json(url: str, params: dict[str, str] | None = None, timeout: int = 180) -> Any:
    qs = urllib.parse.urlencode(params or {})
    full = f"{url}?{qs}" if qs else url
    req = urllib.request.Request(full, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_text(url: str, timeout: int = 180) -> str:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8")


def parse_mastr_date(raw: str | None) -> str | None:
    if not raw:
        return None
    m = re.search(r"\((\d+)\)", raw)
    if not m:
        return None
    ms = int(m.group(1))
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def norm_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def strip_vnb_label(name: str) -> str:
    base = re.sub(r"\s*\(SNB[^)]*\)\s*", "", name, flags=re.I).strip()
    base = re.sub(r"<[^>]+>", "", base)
    return base


def extract_snb(row: dict[str, Any]) -> str | None:
    for field in ("NetzbetreiberMaStRNummer", "NetzbetreiberMastrNummer", "AnschlussNetzMaStRNummer"):
        raw = row.get(field)
        if not raw:
            continue
        text = str(raw).strip().upper()
        if text.startswith("SNB"):
            return text
        m = re.search(r"SNB\d+", text, re.I)
        if m:
            return m.group(0).upper()
    name = row.get("NetzbetreiberNamen") or row.get("NetzbetreiberMaskedNamen") or ""
    m = re.search(r"\(SNB(\d+)\)", name, re.I)
    if m:
        return f"SNB{m.group(1)}"
    m = re.search(r"SNB\d+", name, re.I)
    return m.group(0).upper() if m else None


def bucket_for_row(row: dict[str, Any]) -> tuple[str, str, str]:
    """(bucket_key, bucket_label, operator_class)."""
    snb = extract_snb(row)
    if snb and snb in EON_SNB_BUCKETS:
        key, label = EON_SNB_BUCKETS[snb]
        return key, label, "eon"
    label = strip_vnb_label(row.get("NetzbetreiberNamen") or row.get("NetzbetreiberMaskedNamen") or "Unbekannt")
    n = norm_name(label)
    if any(k in n for k in UNB_KEYWORDS):
        return f"uenb:{n}", label, "uenb"
    if "ewe netz" in n:
        return "ewe_netz", "EWE NETZ", "vnb"
    if any(k in n for k in EON_LEGACY_NAME_FALLBACK):
        return "eon_unmapped", label, "eon"
    return f"vnb:{n}", label, "vnb"


def classify_operator(netzbetreiber: str) -> str:
    """Legacy-Helfer (nur Name) — bitte bucket_for_row bevorzugen."""
    n = norm_name(strip_vnb_label(netzbetreiber))
    if any(k in n for k in UNB_KEYWORDS):
        return "uenb"
    if any(k in n for k in EON_LEGACY_NAME_FALLBACK):
        return "eon"
    return "vnb"


def row_passes_concept(row: dict[str, Any]) -> bool:
    """Konzeptfilter: Batterie, bereits per API-Filter In Betrieb und ≥1 MW netto."""
    tech = f"{row.get('StromspeichertechnologieBezeichnung') or ''} {row.get('Technologie') or ''}".lower()
    if "batterie" not in tech and row.get("Stromspeichertechnologie") not in (524, "524"):
        return False
    return True


def quality_exclusion_reason(row: dict[str, Any]) -> str | None:
    """Qualitätsfilter (optional auf der Seite): natürliche Person, ungeprüfte NS."""
    if row.get("AnlagenbetreiberPersonenArt") == NATURAL_PERSON_ART:
        return "natural_person"
    ebene = (row.get("SpannungsebenenNamen") or "").lower()
    nb_ok = row.get("IsNBPruefungAbgeschlossen") == NB_PRUEFUNG_DONE
    if "niederspannung" in ebene and not nb_ok:
        return "ns_unverified"
    return None


def filter_rows(rows: list[dict[str, Any]], apply_quality_filter: bool) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    concept = [r for r in rows if row_passes_concept(r)]

    def sum_brutto_kw(rr: list[dict[str, Any]]) -> float:
        return sum(float(r.get("Bruttoleistung") or 0) for r in rr)
    reasons: dict[str, int] = defaultdict(int)
    for r in concept:
        reason = quality_exclusion_reason(r)
        if reason:
            reasons[reason] += 1
    if apply_quality_filter:
        kept = [r for r in concept if quality_exclusion_reason(r) is None]
    else:
        kept = concept
    stats = {
        "conceptUnits": len(concept),
        "conceptBruttoKw": sum_brutto_kw(concept),
        "qualityFilteredUnits": len([r for r in concept if quality_exclusion_reason(r) is None]),
        "excludedNaturalPersonUnits": reasons["natural_person"],
        "excludedNsUnverifiedUnits": reasons["ns_unverified"],
        "excludedBruttoKw": sum_brutto_kw([r for r in concept if quality_exclusion_reason(r)]),
    }
    return kept, stats


def fetch_mastr_bess() -> list[dict[str, Any]]:
    filt = "Energieträger~eq~2496~and~Speichertechnologie~eq~524~and~Betriebs-Status~eq~35"
    params = {"page": "1", "pageSize": "25000", "filter": filt, "sort": "Bruttoleistung-desc", "forExport": "true"}
    payload = http_json(MASTR_URL, params)
    rows = payload.get("Data") or []
    out: list[dict[str, Any]] = []
    for row in rows:
        net_kw = float(row.get("Nettonennleistung") or 0)
        if net_kw < MIN_NET_KW:
            continue
        if row.get("Land") not in (None, "Deutschland", ""):
            if row.get("LandId") not in (84, "84"):
                continue
        out.append(row)
    return out


def locate_row(row: dict[str, Any]) -> tuple[float | None, float | None, str, bool]:
    """Koordinate, Qualität, auf Karte zeigen? Einheiten ohne MaStR-Koordinate nicht hashen."""
    lat = row.get("Breitengrad")
    lng = row.get("Laengengrad")
    if lat and lng:
        return float(lat), float(lng), "exakt", True
    plz = (row.get("Plz") or "").strip()
    if plz in PLZ_CENTROIDS:
        unit_id = row.get("EinheitMastrNummer") or row.get("Id") or ""
        seed = hashlib.sha1(f"{unit_id}|{plz}".encode()).hexdigest()
        h = int(seed[:8], 16)
        jitter_lat = ((h % 1000) / 1000 - 0.5) * 0.02
        jitter_lng = (((h // 1000) % 1000) / 1000 - 0.5) * 0.03
        base_lat, base_lng = PLZ_CENTROIDS[plz]
        return base_lat + jitter_lat, base_lng + jitter_lng, "plz_mittelpunkt", True
    return None, None, "ohne_koordinate", False


def aggregate_locations(rows: list[dict[str, Any]], apply_quality_filter: bool) -> dict[str, Any]:
    filtered, _filter_stats = filter_rows(rows, apply_quality_filter)
    loc: dict[str, dict[str, Any]] = {}
    unit_brutto = unit_netto = unit_energy_kwh = 0.0
    off_map_units = 0
    for row in filtered:
        brutto_kw = float(row.get("Bruttoleistung") or 0)
        netto_kw = float(row.get("Nettonennleistung") or 0)
        energy_kwh = float(row.get("NutzbareSpeicherkapazitaet") or 0)
        unit_brutto += brutto_kw
        unit_netto += netto_kw
        unit_energy_kwh += energy_kwh

        lat, lng, qual, map_ok = locate_row(row)
        if not map_ok or lat is None or lng is None:
            off_map_units += 1
            continue

        loc_key = f"{round(lat, 4)}|{round(lng, 4)}"
        vnb = strip_vnb_label(row.get("NetzbetreiberNamen") or row.get("NetzbetreiberMaskedNamen") or "Unbekannt")
        bucket_key, bucket_label, operator_class = bucket_for_row(row)
        mw = brutto_kw / 1000
        entry = loc.setdefault(
            loc_key,
            {
                "lat": lat,
                "lng": lng,
                "bruttoMw": 0.0,
                "nettoMw": 0.0,
                "energyMwh": 0.0,
                "units": 0,
                "coordinateQuality": qual,
                "landkreis": row.get("Landkreis") or "",
                "bundesland": row.get("Bundesland") or "",
                "vnbDominant": vnb,
                "_dominantMw": 0.0,
                "operatorClass": operator_class,
                "vnbBucketKey": bucket_key,
                "vnbBucketLabel": bucket_label,
                "inbetriebnahmeYears": [],
            },
        )
        entry["bruttoMw"] += mw
        entry["nettoMw"] += netto_kw / 1000
        entry["energyMwh"] += energy_kwh / 1000
        entry["units"] += 1
        if mw >= entry["_dominantMw"]:
            entry["_dominantMw"] = mw
            entry["vnbDominant"] = vnb
            entry["operatorClass"] = operator_class
            entry["vnbBucketKey"] = bucket_key
            entry["vnbBucketLabel"] = bucket_label
        inb = parse_mastr_date(row.get("InbetriebnahmeDatum"))
        if inb:
            entry["inbetriebnahmeYears"].append(int(inb[:4]))

    sites: list[dict[str, Any]] = []
    for entry in loc.values():
        entry.pop("_dominantMw", None)
        sites.append(entry)

    totals = {
        "units": len(filtered),
        "bruttoMw": round(unit_brutto / 1000, 6),
        "nettoMw": round(unit_netto / 1000, 6),
        "energyGwh": round(unit_energy_kwh / 1_000_000, 6),
    }
    return {
        "sites": sites,
        "totals": totals,
        "filteredUnitCount": len(filtered),
        "rawUnitCount": len(rows),
        "siteCount": len(sites),
        "unitsWithoutMapCoordinate": off_map_units,
    }


def vnb_rollup_units(filtered: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by: dict[str, dict[str, Any]] = {}
    for row in filtered:
        bucket_key, bucket_label, operator_class = bucket_for_row(row)
        brutto_kw = float(row.get("Bruttoleistung") or 0)
        netto_kw = float(row.get("Nettonennleistung") or 0)
        rec = by.setdefault(
            bucket_key,
            {
                "key": bucket_key,
                "label": bucket_label,
                "operatorClass": operator_class,
                "bruttoMw": 0.0,
                "nettoMw": 0.0,
                "units": 0,
            },
        )
        rec["bruttoMw"] += brutto_kw / 1000
        rec["nettoMw"] += netto_kw / 1000
        rec["units"] += 1
    out: list[dict[str, Any]] = []
    for rec in sorted(by.values(), key=lambda r: -r["bruttoMw"]):
        out.append({**rec, "sites": rec["units"]})
    return out


def growth_split_units(filtered: list[dict[str, Any]], eon_full_group: bool) -> dict[str, Any]:
    buckets = ("eon_gruppe", "eon_kern", "mitnetz_envia", "ewe_netz", "vnb_rest", "uenb")
    acc = {b: {"vor2026Mw": 0.0, "y2026Mw": 0.0} for b in buckets}

    def add(bucket: str, mw: float, yr: int) -> None:
        if yr < 2026:
            acc[bucket]["vor2026Mw"] += mw
        else:
            acc[bucket]["y2026Mw"] += mw

    for row in filtered:
        bucket_key, _, operator_class = bucket_for_row(row)
        inb = parse_mastr_date(row.get("InbetriebnahmeDatum"))
        if not inb:
            continue
        yr = int(inb[:4])
        mw = float(row.get("Bruttoleistung") or 0) / 1000

        if operator_class == "uenb":
            add("uenb", mw, yr)
            continue
        if bucket_key == "mitnetz_envia":
            add("mitnetz_envia", mw, yr)
            add("eon_gruppe", mw, yr)
            continue
        if bucket_key.startswith("eon"):
            if bucket_key in ("eon_regionetz", "eon_energis"):
                if eon_full_group:
                    add("eon_gruppe", mw, yr)
                else:
                    add("vnb_rest", mw, yr)
            elif eon_full_group:
                add("eon_gruppe", mw, yr)
            else:
                snb = extract_snb(row)
                if snb and snb in EON_SNB_KERN:
                    add("eon_kern", mw, yr)
                else:
                    add("vnb_rest", mw, yr)
            continue
        if bucket_key == "ewe_netz":
            add("ewe_netz", mw, yr)
            continue
        add("vnb_rest", mw, yr)

    return acc


def compute_headline_stats(filtered: list[dict[str, Any]]) -> dict[str, Any]:
    def sum_snb_set(snbs: frozenset[str]) -> dict[str, float]:
        units = 0
        brutto_kw = netto_kw = 0.0
        for row in filtered:
            snb = extract_snb(row)
            if snb not in snbs:
                continue
            units += 1
            brutto_kw += float(row.get("Bruttoleistung") or 0)
            netto_kw += float(row.get("Nettonennleistung") or 0)
        return {
            "units": int(units),
            "bruttoMw": round(brutto_kw / 1000, 1),
            "nettoMw": round(netto_kw / 1000, 1),
        }

    total_brutto_kw = sum(float(r.get("Bruttoleistung") or 0) for r in filtered)
    eon_with = sum_snb_set(EON_SNB_IDS)
    eon_without = sum_snb_set(EON_SNB_WITHOUT_MITNETZ)
    mitnetz = sum_snb_set(frozenset({"SNB916269213931"}))

    zubau_all = zubau_eon = zubau_eon_ohne_mitnetz = 0.0
    for row in filtered:
        inb = parse_mastr_date(row.get("InbetriebnahmeDatum"))
        if not inb or int(inb[:4]) < 2026:
            continue
        mw = float(row.get("Bruttoleistung") or 0) / 1000
        zubau_all += mw
        snb = extract_snb(row)
        if snb in EON_SNB_IDS:
            zubau_eon += mw
        if snb in EON_SNB_WITHOUT_MITNETZ:
            zubau_eon_ohne_mitnetz += mw

    by_snb: dict[str, dict[str, float]] = {}
    for snb in sorted(EON_SNB_BUCKETS):
        by_snb[snb] = sum_snb_set(frozenset({snb}))

    total_brutto_mw = total_brutto_kw / 1000
    share_with = (eon_with["bruttoMw"] / total_brutto_mw * 100) if total_brutto_mw else 0.0
    share_without = (eon_without["bruttoMw"] / total_brutto_mw * 100) if total_brutto_mw else 0.0
    zubau_share = (zubau_eon / zubau_all * 100) if zubau_all else 0.0

    return {
        "eonWithMitnetz": {**eon_with, "sharePctTotal": round(share_with, 0)},
        "eonWithoutMitnetz": {**eon_without, "sharePctTotal": round(share_without, 0)},
        "mitnetzOnly": mitnetz,
        "zubau2026": {
            "allBruttoMw": round(zubau_all, 1),
            "eonWithMitnetzBruttoMw": round(zubau_eon, 1),
            "eonWithoutMitnetzBruttoMw": round(zubau_eon_ohne_mitnetz, 1),
            "eonSharePct": round(zubau_share, 0),
            "eonSharePctWithoutMitnetz": round((zubau_eon_ohne_mitnetz / zubau_all * 100) if zubau_all else 0, 0),
        },
        "bySnb": by_snb,
    }


def landkreis_rollup(sites: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by: dict[tuple[str, str], dict[str, Any]] = {}
    for s in sites:
        lk = (s.get("landkreis") or "Unbekannt").strip()
        bl = (s.get("bundesland") or "").strip()
        key = (bl, lk)
        row = by.setdefault(
            key,
            {"bundesland": bl, "landkreis": lk, "bruttoMw": 0.0, "nettoMw": 0.0, "sites": 0, "dominantVnb": s.get("vnbDominant", "")},
        )
        row["bruttoMw"] += s["bruttoMw"]
        row["nettoMw"] += s["nettoMw"]
        row["sites"] += 1
    return sorted(by.values(), key=lambda r: -r["bruttoMw"])


def vnb_rollup(sites: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Kartenpunkt-Ranking (Legacy) — Kopfzahlen nutzen vnb_rollup_units."""
    by: dict[str, dict[str, Any]] = {}
    for s in sites:
        key = s["vnbBucketKey"]
        row = by.setdefault(
            key,
            {
                "key": key,
                "label": s["vnbBucketLabel"],
                "operatorClass": s["operatorClass"],
                "bruttoMw": 0.0,
                "nettoMw": 0.0,
                "sites": 0,
            },
        )
        row["bruttoMw"] += s["bruttoMw"]
        row["nettoMw"] += s["nettoMw"]
        row["sites"] += 1
    rows = sorted(by.values(), key=lambda r: -r["bruttoMw"])
    return rows


def fetch_smard_ee_redispatch_2025() -> list[dict[str, Any]]:
    text = http_text(SMARD_CSV_URL, timeout=120)
    sums: dict[int, float] = defaultdict(float)
    for line in text.splitlines():
        if not line.startswith("s-nepm_baet-1-"):
            continue
        parts = line.split(";")
        if not parts[1].startswith("2025-"):
            continue
        idx = int(parts[0].rsplit("-", 1)[-1])
        vals = [float(x) if x else 0.0 for x in parts[2:]]
        wind = vals[SMARD_RE_ET_COL_WIND_ON] if len(vals) > SMARD_RE_ET_COL_WIND_ON else 0.0
        pv = vals[SMARD_RE_ET_COL_PV] if len(vals) > SMARD_RE_ET_COL_PV else 0.0
        sums[idx] += wind + pv
    out: list[dict[str, Any]] = []
    for i in range(1, 17):
        bl = BUNDESLAENDER_DE[i - 1]
        out.append({"bundesland": bl, "eeRedispatch2025Gwh": round(sums.get(i, 0.0), 3), "source": "smard_energiedaten_kompakt"})
    return out


def sum_generation_by_bundesland(energy_id: str) -> dict[str, float]:
    """Summe Nettonennleistung (GW) je Bundesland, In Betrieb (ein Deutschland-Durchlauf)."""
    max_pages = int(os.environ.get("MASTR_GEN_MAX_PAGES", "80"))
    cache_file = CACHE / f"ee-stock-{energy_id}-p{max_pages}.json"
    if cache_file.is_file():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    totals: dict[str, float] = defaultdict(float)
    filt = f"Energieträger~eq~{energy_id}~and~Betriebs-Status~eq~35"
    page = 1
    while page <= max_pages:
        sys.stderr.write(f"EE {energy_id} Seite {page}/{max_pages} …\n")
        params = {"page": str(page), "pageSize": "25000", "filter": filt, "forExport": "true"}
        payload = http_json(MASTR_URL, params)
        batch = payload.get("Data") or []
        if not batch:
            break
        for row in batch:
            bl = (row.get("Bundesland") or "").strip()
            if not bl:
                continue
            if energy_id == "2497":
                tech = (row.get("NameDerTechnologie") or row.get("Technologie") or "").lower()
                if "offshore" in tech or "see" in tech:
                    continue
            kw = float(row.get("Nettonennleistung") or row.get("Bruttoleistung") or 0)
            totals[bl] += kw / 1_000_000
        if len(batch) < 25000:
            break
        page += 1
    out = {k: round(v, 3) for k, v in totals.items()}
    cache_file.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    return out


def fetch_ee_stock_mastr(_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Wind an Land + PV je Bundesland (GW), MaStR Stromerzeugung."""
    pv = sum_generation_by_bundesland("2495")
    wind = sum_generation_by_bundesland("2497")
    out: list[dict[str, Any]] = []
    for bl in BUNDESLAENDER_DE:
        out.append(
            {
                "bundesland": bl,
                "windOnshoreGw": wind.get(bl, 0.0),
                "pvGw": pv.get(bl, 0.0),
            }
        )
    return out


def uenb_planning_vs_operation(rows: list[dict[str, Any]]) -> dict[str, float]:
    def is_uenb_row(row: dict[str, Any]) -> bool:
        ebene = (row.get("SpannungsebenenNamen") or "").lower()
        return any(x in ebene for x in ("höchstspannung", "hoechstspannung", "übertragung", "uebertragung")) or classify_operator(
            row.get("NetzbetreiberNamen") or ""
        ) == "uenb"

    in_betrieb_kw = sum(float(r.get("Bruttoleistung") or 0) for r in rows if is_uenb_row(r))

    filt = "Energieträger~eq~2496~and~Speichertechnologie~eq~524~and~Betriebs-Status~eq~31"
    planned_kw = 0.0
    params = {"page": "1", "pageSize": "25000", "filter": filt, "sort": "Bruttoleistung-desc", "forExport": "true"}
    try:
        payload = http_json(MASTR_URL, params)
        for row in payload.get("Data") or []:
            if float(row.get("Nettonennleistung") or 0) < MIN_NET_KW:
                continue
            if not is_uenb_row(row):
                continue
            planned_kw += float(row.get("Bruttoleistung") or 0)
    except Exception:
        pass

    return {
        "inBetriebBruttoGw": round(in_betrieb_kw / 1_000_000, 3),
        "inPlanungBruttoGw": round(planned_kw / 1_000_000, 3),
    }


def try_fetch_vg250_lan_geojson() -> dict[str, Any] | None:
    """Optional BKG VG250 Landkreise — skipped if download fails (noted in manifest)."""
    candidates = [
        os.environ.get("BKG_VG250_LAN_GEOJSON_URL", ""),
        "https://daten.gdz.bkg.bund.de/geodata/VG250/VG250_KRS/SVG350_KRS.geojson",
        "https://www.inspire-gepir.de/geometrien/als-dienst3/VG250/lan/dvg2LAN.shp.geojson",
    ]
    url = next((u for u in candidates if u), "")
    if not url:
        return None
    try:
        raw = http_text(url, timeout=120)
        return json.loads(raw)
    except Exception as exc:
        sys.stderr.write(f"VG250 download skipped: {exc}\n")
        return None


def simplify_geojson(geo: dict[str, Any], landkreis_power: dict[tuple[str, str], float]) -> dict[str, Any]:
    feats = []
    for f in geo.get("features") or []:
        props = f.get("properties") or {}
        name = props.get("GEN") or props.get("name") or props.get("BEZ") or ""
        bl = props.get("BL") or props.get("bundesland") or ""
        key = (str(bl), str(name))
        brutto = landkreis_power.get((bl, name), landkreis_power.get(("", name), 0.0))
        feats.append(
            {
                "type": "Feature",
                "properties": {"landkreis": name, "bundesland": bl, "bruttoMw": round(brutto, 3)},
                "geometry": f.get("geometry"),
            }
        )
    return {"type": "FeatureCollection", "features": feats}


def load_vnb_network_lengths() -> dict[str, Any]:
    path = OUT / "vnb-network-lengths.json"
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"status": "folgt", "documentedCount": 0, "entries": []}


def scatter_for_sites(sites: list[dict[str, Any]], smard_bl: list[dict[str, Any]]) -> list[dict[str, Any]]:
    bess_bl: dict[str, float] = defaultdict(float)
    for s in sites:
        bl = (s.get("bundesland") or "").strip()
        if bl:
            bess_bl[bl] += s["bruttoMw"]
    scatter: list[dict[str, Any]] = []
    for row in smard_bl:
        bl = row["bundesland"]
        scatter.append(
            {
                "bundesland": bl,
                "eeRedispatch2025Gwh": row["eeRedispatch2025Gwh"],
                "bessBruttoGw": round(bess_bl.get(bl, 0.0) / 1000, 3),
            }
        )
    return scatter


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = fetch_mastr_bess()
    _, filter_stats = filter_rows(rows, apply_quality_filter=False)
    model_concept = aggregate_locations(rows, apply_quality_filter=False)
    model_quality = aggregate_locations(rows, apply_quality_filter=True)

    concept_filtered, _ = filter_rows(rows, apply_quality_filter=False)
    quality_filtered, _ = filter_rows(rows, apply_quality_filter=True)

    headline_stats = compute_headline_stats(concept_filtered)
    headline_stats_quality = compute_headline_stats(quality_filtered)

    smard_bl = fetch_smard_ee_redispatch_2025()
    ee_max_pages = int(os.environ.get("MASTR_GEN_MAX_PAGES", "80"))
    ee_stock = [] if os.environ.get("SKIP_EE_STOCK") == "1" else fetch_ee_stock_mastr(rows)
    uenb = uenb_planning_vs_operation(rows)

    vnb_rows = vnb_rollup_units(concept_filtered)
    vnb_rows_quality = vnb_rollup_units(quality_filtered)
    landkreis_rows = landkreis_rollup(model_concept["sites"])
    lk_power = {(r["bundesland"], r["landkreis"]): r["bruttoMw"] for r in landkreis_rows}

    geo = try_fetch_vg250_lan_geojson()
    geo_out: dict[str, Any] | None = None
    if geo:
        geo_out = simplify_geojson(geo, lk_power)

    scatter = scatter_for_sites(model_concept["sites"], smard_bl)
    scatter_quality = scatter_for_sites(model_quality["sites"], smard_bl)

    net_lengths = load_vnb_network_lengths()
    net_doc = int(net_lengths.get("documentedCount") or len(net_lengths.get("entries") or []))
    net_available = net_doc >= int(net_lengths.get("minimumForNormierung") or 8) and net_lengths.get("status") != "folgt"

    uenb_units_concept = sum(1 for r in concept_filtered if bucket_for_row(r)[2] == "uenb")
    dup_locations = model_concept["filteredUnitCount"] - model_concept["siteCount"]
    off_map = model_concept.get("unitsWithoutMapCoordinate", 0)

    manifest = {
        "version": 1,
        "generatedAt": now,
        "stichtagMastr": now[:10],
        "sources": [
            {
                "name": "Marktstammdatenregister",
                "license": "dl-de/by-2-0",
                "retrieved": now[:10],
                "url": "https://www.marktstammdatenregister.de/MaStR",
            },
            {
                "name": "SMARD Energiedaten kompakt (s-nepm_baet-1-*)",
                "license": "CC BY 4.0",
                "retrieved": now[:10],
                "url": SMARD_CSV_URL,
            },
        ],
        "plausibility": {
            "unitsGe1MwNetto": model_concept["filteredUnitCount"],
            "sitesOnMap": model_concept["siteCount"],
            "bruttoGw": round(model_concept["totals"]["bruttoMw"] / 1000, 2),
            "nettoGw": round(model_concept["totals"]["nettoMw"] / 1000, 2),
            "energyGwh": round(model_concept["totals"]["energyGwh"], 2),
            "note": "Default = Konzeptfilter (575 Ziel); Qualitätsfilter optional",
        },
        "filterBreakdown": {
            **filter_stats,
            "excludedBruttoMw": round(filter_stats["excludedBruttoKw"] / 1000, 1),
            "unitsAfterQualityFilter": model_quality["filteredUnitCount"],
            "sitesAfterQualityFilter": model_quality["siteCount"],
            "unitsAggregatedToSameCoordinate": dup_locations,
            "uenbAttachedUnitsConcept": uenb_units_concept,
            "unitsWithoutMapCoordinate": off_map,
            "explanation": (
                f"{filter_stats['excludedNaturalPersonUnits']} Einheiten natürliche Personen, "
                f"{filter_stats['excludedNsUnverifiedUnits']} mit Niederspannung ohne abgeschlossene NB-Prüfung; "
                f"{dup_locations} Einheiten teilen Kartenkoordinate mit anderen Einheiten; "
                f"{off_map} ohne MaStR-Koordinate (in Summen, nicht auf Karte)."
            ),
        },
        "vg250": {
            "available": geo_out is not None,
            "license": "dl-de/by-2-0",
        },
        "networkLengthNormalization": {
            "available": net_available,
            "status": net_lengths.get("status", "folgt"),
            "documentedVnbCount": net_doc,
            "note": "MW je 1.000 km Stromkreislänge: folgt, bis ≥8 Top-VNB mit URL belegt sind.",
            "eeStockNormalization": True,
        },
        "eonSnbIds": sorted(EON_SNB_IDS),
        "eeStockMastr": {
            "maxPagesPerEnergyCarrier": ee_max_pages if os.environ.get("SKIP_EE_STOCK") != "1" else 0,
            "complete": bool(ee_stock) and sum(r["windOnshoreGw"] + r["pvGw"] for r in ee_stock) >= 140,
            "note": "Wind/PV je Bundesland; Seitenzahl über MASTR_GEN_MAX_PAGES (Default 80).",
        },
    }

    payload = {
        "manifest": manifest,
        "totalsDefault": model_concept["totals"],
        "totalsQualityFiltered": model_quality["totals"],
        "sitesDefault": model_concept["sites"],
        "sitesQualityFiltered": model_quality["sites"],
        "vnbRanking": vnb_rows,
        "vnbRankingQualityFiltered": vnb_rows_quality,
        "landkreise": landkreis_rows,
        "growthDefault": growth_split_units(concept_filtered, True),
        "growthQualityFiltered": growth_split_units(quality_filtered, True),
        "growthEonKern": growth_split_units(concept_filtered, False),
        "headlineStats": headline_stats,
        "headlineStatsQualityFiltered": headline_stats_quality,
        "scatterBundeslaender": scatter,
        "scatterQualityFiltered": scatter_quality,
        "eeStockBundeslaender": ee_stock,
        "uenbEbene": uenb,
        "vg250": geo_out,
        "vnbNetworkLengths": net_lengths.get("entries") or [],
    }

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "bundle.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    if geo_out:
        (OUT / "vg250-landkreise.geojson").write_text(json.dumps(geo_out), encoding="utf-8")

    print(
        json.dumps(
            {
                "out": str(OUT),
                "units": model_concept["filteredUnitCount"],
                "bruttoGw": manifest["plausibility"]["bruttoGw"],
                "vg250": geo_out is not None,
                "eeStock": len(ee_stock),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()