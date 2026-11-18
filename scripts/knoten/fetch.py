"""Holt öffentliche Rohdaten (Abruf 18.11.2026) in cache/.
SMARD (Bundesnetzagentur | SMARD.de, CC BY 4.0): Regelzonen-Viertelstunden
  4067 Wind onshore, 4068 Photovoltaik, 410 Stromverbrauch (Netzlast)
Energy-Charts (Fraunhofer ISE, CC BY 4.0): public_power DE, price DE-LU, installed_power DE."""
import json, os, urllib.request, datetime as dt
C = os.path.join(os.path.dirname(__file__), "cache"); os.makedirs(C, exist_ok=True)
def get(url):
    with urllib.request.urlopen(url, timeout=60) as r: return json.load(r)
START = dt.datetime(2026, 5, 25).timestamp()*1000
for f in (4067, 4068, 410):
    for reg in ("TenneT", "TransnetBW", "Amprion", "50Hertz"):
        out = os.path.join(C, f"smard_{f}_{reg}.json")
        if os.path.exists(out): continue
        idx = get(f"https://www.smard.de/app/chart_data/{f}/{reg}/index_quarterhour.json")["timestamps"]
        series = []
        for ts in idx:
            if ts < START - 7*86400e3: continue
            series += get(f"https://www.smard.de/app/chart_data/{f}/{reg}/{f}_{reg}_quarterhour_{ts}.json")["series"]
        json.dump(series, open(out, "w")); print(out, len(series))
for name, url in {
    "public_power_summer.json": "https://api.energy-charts.info/public_power?country=de&start=2026-06-01T00:00%2B02:00&end=2026-07-31T23:45%2B02:00",
    "price_summer.json": "https://api.energy-charts.info/price?bzn=DE-LU&start=2026-06-01T00:00%2B02:00&end=2026-07-31T23:45%2B02:00",
}.items():
    out = os.path.join(C, name)
    if not os.path.exists(out): json.dump(get(url), open(out, "w")); print(out)
