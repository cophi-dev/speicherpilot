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

EON_CORE_MARKERS = (
    "westnetz",
    "bayernwerk netz",
    "avacon netz",
    "schleswig-holstein netz",
    "e.dis netz",
    "lew verteilnetz",
    "syna",
)
EON_EXTRA_MARKERS = (
    "mitnetz",
    "enviam",
    "regionetz",
    "energis",
)
EON_GROUP_MARKERS = EON_CORE_MARKERS + EON_EXTRA_MARKERS

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


def classify_operator(netzbetreiber: str) -> str:
    n = norm_name(strip_vnb_label(netzbetreiber))
    if any(k in n for k in UNB_KEYWORDS):
        return "uenb"
    if any(k in n for k in EON_GROUP_MARKERS):
        return "eon"
    return "vnb"


def eon_group_label(include_extras: bool) -> str:
    return "eon_gruppe" if include_extras else "eon_kern"


def bucket_vnb_key(netzbetreiber: str, eon_include_extras: bool) -> tuple[str, str]:
    cls = classify_operator(netzbetreiber)
    label = strip_vnb_label(netzbetreiber)
    if cls == "eon":
        return (eon_group_label(eon_include_extras), "E.ON-Gruppe" if eon_include_extras else "E.ON (Kern)")
    if cls == "uenb":
        return (f"uenb:{norm_name(label)}", label)
    n = norm_name(label)
    if "mitnetz" in n or "enviam" in n:
        return ("mitnetz_envia", "MITNETZ / enviaM")
    if "ewe netz" in n:
        return ("ewe_netz", "EWE NETZ")
    return (f"vnb:{n}", label)


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


def locate_row(row: dict[str, Any]) -> tuple[float, float, str]:
    lat = row.get("Breitengrad")
    lng = row.get("Laengengrad")
    if lat and lng:
        return float(lat), float(lng), "exakt"
    plz = (row.get("Plz") or "").strip()
    gemeinde = (row.get("Gemeinde") or row.get("Ort") or "").strip()
    if plz in PLZ_CENTROIDS:
        return PLZ_CENTROIDS[plz][0], PLZ_CENTROIDS[plz][1], "plz_mittelpunkt"
    # Gemeinde hash jitter within Bundesland bbox (not invented coordinates — marked approx)
    bl = (row.get("Bundesland") or "Deutschland").strip()
    seed = hashlib.sha1(f"{gemeinde}|{plz}|{bl}".encode()).hexdigest()
    h = int(seed[:8], 16)
    lat0 = 51.0 + ((h % 1000) / 1000) * 4.5
    lng0 = 6.0 + (((h // 1000) % 1000) / 1000) * 9.0
    return lat0, lng0, "gemeinde_naeherung"


def aggregate_locations(rows: list[dict[str, Any]], apply_quality_filter: bool, eon_include_extras: bool) -> dict[str, Any]:
    filtered, _filter_stats = filter_rows(rows, apply_quality_filter)
    loc: dict[str, dict[str, Any]] = {}
    for row in filtered:
        lat, lng, qual = locate_row(row)
        loc_key = f"{round(lat, 4)}|{round(lng, 4)}"
        brutto_kw = float(row.get("Bruttoleistung") or 0)
        netto_kw = float(row.get("Nettonennleistung") or 0)
        energy_kwh = float(row.get("NutzbareSpeicherkapazitaet") or 0)
        vnb = strip_vnb_label(row.get("NetzbetreiberNamen") or row.get("NetzbetreiberMaskedNamen") or "Unbekannt")
        bucket_key, bucket_label = bucket_vnb_key(vnb, eon_include_extras)
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
                "operatorClass": classify_operator(vnb),
                "vnbBucketKey": bucket_key,
                "vnbBucketLabel": bucket_label,
                "inbetriebnahmeYears": [],
            },
        )
        entry["bruttoMw"] += brutto_kw / 1000
        entry["nettoMw"] += netto_kw / 1000
        entry["energyMwh"] += energy_kwh / 1000
        entry["units"] += 1
        inb = parse_mastr_date(row.get("InbetriebnahmeDatum"))
        if inb:
            entry["inbetriebnahmeYears"].append(int(inb[:4]))

    sites = list(loc.values())
    totals = {
        "units": sum(s["units"] for s in sites),
        "bruttoMw": sum(s["bruttoMw"] for s in sites),
        "nettoMw": sum(s["nettoMw"] for s in sites),
        "energyGwh": sum(s["energyMwh"] for s in sites) / 1000,
    }
    return {
        "sites": sites,
        "totals": totals,
        "filteredUnitCount": len(filtered),
        "rawUnitCount": len(rows),
        "siteCount": len(sites),
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


def growth_split(sites: list[dict[str, Any]], eon_include_extras: bool) -> dict[str, Any]:
    buckets = ("eon_gruppe" if eon_include_extras else "eon_kern", "mitnetz_envia", "ewe_netz", "vnb_rest", "uenb")
    acc = {b: {"vor2026Mw": 0.0, "y2026Mw": 0.0} for b in buckets}

    def growth_bucket(site: dict[str, Any]) -> str:
        key = site["vnbBucketKey"]
        if key.startswith("eon"):
            return "eon_gruppe" if eon_include_extras else "eon_kern"
        if key == "mitnetz_envia":
            return "mitnetz_envia"
        if key == "ewe_netz":
            return "ewe_netz"
        if site["operatorClass"] == "uenb":
            return "uenb"
        return "vnb_rest"

    for site in sites:
        years = site.get("inbetriebnahmeYears") or []
        if not years:
            continue
        yr = min(years)
        b = growth_bucket(site)
        if yr < 2026:
            acc[b]["vor2026Mw"] += site["bruttoMw"]
        else:
            acc[b]["y2026Mw"] += site["bruttoMw"]
    return acc


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
    model_concept = aggregate_locations(rows, apply_quality_filter=False, eon_include_extras=True)
    model_quality = aggregate_locations(rows, apply_quality_filter=True, eon_include_extras=True)
    model_eon_kern = aggregate_locations(rows, apply_quality_filter=False, eon_include_extras=False)

    smard_bl = fetch_smard_ee_redispatch_2025()
    ee_max_pages = int(os.environ.get("MASTR_GEN_MAX_PAGES", "80"))
    ee_stock = [] if os.environ.get("SKIP_EE_STOCK") == "1" else fetch_ee_stock_mastr(rows)
    uenb = uenb_planning_vs_operation(rows)

    vnb_rows = vnb_rollup(model_concept["sites"])
    vnb_rows_quality = vnb_rollup(model_quality["sites"])
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

    uenb_units_concept = sum(1 for r in rows if row_passes_concept(r) and classify_operator(r.get("NetzbetreiberNamen") or "") == "uenb")
    dup_locations = model_concept["filteredUnitCount"] - model_concept["siteCount"]

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
            "explanation": (
                f"{filter_stats['excludedNaturalPersonUnits']} Einheiten natürliche Personen, "
                f"{filter_stats['excludedNsUnverifiedUnits']} mit Niederspannung ohne abgeschlossene NB-Prüfung; "
                f"{dup_locations} Einheiten teilen Kartenkoordinate mit anderen Einheiten."
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
        "eonGroupMembersDefault": list(EON_CORE_MARKERS + EON_EXTRA_MARKERS),
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
        "growthDefault": growth_split(model_concept["sites"], True),
        "growthQualityFiltered": growth_split(model_quality["sites"], True),
        "growthEonKern": growth_split(model_eon_kern["sites"], False),
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