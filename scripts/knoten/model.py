"""Modellknoten-Rechnung 'dein Knoten' (Forschungskonzept knoten_und_menue_v1).
Nur öffentliche Daten (cache/, Abruf 18.11.2026): SMARD Regelzonen 15 min (CC BY 4.0),
Energy-Charts public_power/price/installed_power (CC BY 4.0). Keine HNE-Daten.
Modellknoten = gedachtes Umspannwerk HS/MS, keine reale Adresse. Szenarien rechnen.
"""
import json, os, numpy as np, pandas as pd
from scipy.optimize import linprog
from scipy.sparse import lil_matrix, csr_matrix, hstack, vstack, eye, diags
C = os.path.join(os.path.dirname(__file__), "cache")
OUT = os.path.join(os.path.dirname(__file__), "ergebnisse"); os.makedirs(OUT, exist_ok=True)
TZ = "Europe/Berlin"
FLEET_P, FLEET_E = 4644.09, 8152.46          # MW, MWh, battery-charts 31.10.2026
RTE = 0.85; ETA = RTE ** 0.5; SOC_LO, SOC_HI, SOC0 = 0.1, 0.9, 0.5
EPS = 0.05                                    # €/MWh Durchsatz-Tiebreaker
L = 80.0                                      # MW, 2 × 40 MVA HS/MS (SimBench 1-MV-semiurb, cos φ = 1)
NODES = {
  "wind":  dict(name="Windknoten Nord",  zone="TenneT",     wind=110, pv=15,  load=20),
  "solar": dict(name="Solarknoten Süd",  zone="TransnetBW", wind=5,   pv=130, load=25),
  "stadt": dict(name="Stadtknoten",      zone="Amprion",    wind=0,   pv=10,  load=80),
}

def smard(f, zone):
    s = json.load(open(f"{C}/smard_{f}_{zone}.json"))
    x = pd.Series({pd.Timestamp(t, unit="ms", tz="UTC"): v for t, v in s}).dropna().astype(float)
    return x[~x.index.duplicated()]

def ec(fn, key=None):
    d = json.load(open(f"{C}/{fn}"))
    idx = pd.to_datetime(d["unix_seconds"], unit="s", utc=True)
    if key is None:
        return pd.Series(d["price"], index=idx, dtype=float)
    return {p["name"]: pd.Series(p["data"], index=idx, dtype=float) for p in d["production_types"]}

def inst(name, month):
    d = json.load(open(f"{C}/inst.json"))
    i = d["time"].index(month)
    for p in d["production_types"]:
        if p["name"] == name: return p["data"][i] * 1000  # MW
def national():
    a = ec("public_power_summer.json", 1); b = ec("public_power.json", 1)
    nat = {k: pd.concat([a[k], b[k]]) for k in ("Wind onshore", "Solar", "Load")}
    price = pd.concat([ec("price_summer.json"), ec("price.json")])
    return nat, price[~price.index.duplicated()]

def profiles(nat):
    """Regionale Form (SMARD Regelzone), nationale Höhe: Mittel des Kapazitätsfaktors je Fenster
    = nationaler Mittelwert (Energy-Charts Erzeugung / installierte Leistung)."""
    cf_w = nat["Wind onshore"] / inst("Wind onshore", "10.2026")
    cf_s = nat["Solar"] / inst("Solar AC", "10.2026")
    out = {}
    for z in {n["zone"] for n in NODES.values()}:
        w, s, l = smard(4067, z), smard(4068, z), smard(410, z)
        df = pd.DataFrame({"w": w, "s": s, "l": l, "cfw": cf_w, "cfs": cf_s}).dropna()
        for lab, (a, b) in {"sommer": ("2026-06-01", "2026-08-01"), "herbst": ("2026-10-01", "2026-11-18")}.items():
            m = (df.index.tz_convert(TZ) >= pd.Timestamp(a, tz=TZ)) & (df.index.tz_convert(TZ) < pd.Timestamp(b, tz=TZ))
            q = df[m].copy()
            q["cfw_r"] = q.w / q.w.mean() * q.cfw.mean()
            q["cfs_r"] = q.s / q.s.mean() * q.cfs.mean()
            q["lf"] = q.l / df.l[(df.index.tz_convert(TZ) >= pd.Timestamp("2026-06-01", tz=TZ))].max()
            out[(z, lab)] = q
    return out

def solve_day(price, base, P, E, limit=None):
    n = len(price); dt = 0.25
    # x = [c(n), d(n), e(n)]
    cobj = np.concatenate([price*dt + EPS*dt, -price*dt + EPS*dt, np.zeros(n)])
    A = lil_matrix((n, 3*n)); b = np.zeros(n)
    for t in range(n):
        A[t, t] = -ETA*dt; A[t, n+t] = dt/ETA; A[t, 2*n+t] = 1
        if t: A[t, 2*n+t-1] = -1
        else: b[t] = SOC0*E
    bounds = [(0, P)]*n + [(0, P)]*n + [(SOC_LO*E, SOC_HI*E)]*(n-1) + [(SOC0*E, SOC0*E)]
    Aub = bub = None
    if limit is not None:
        hi = np.maximum(limit, base); lo = np.minimum(-limit, base)
        I = eye(n, format="csr"); Z = csr_matrix((n, n))
        F = hstack([I, -I, Z])
        Aub = vstack([F, -F]).tocsr(); bub = np.concatenate([hi - base, base - lo])
    r = linprog(cobj, A_ub=Aub, b_ub=bub, A_eq=A.tocsr(), b_eq=b, bounds=bounds, method="highs")
    assert r.status == 0, r.message
    c, d = r.x[:n], r.x[n:2*n]
    return c, d, float(np.sum(price*dt*(d - c)))

def node_series(key, prof, lab):
    n = NODES[key]; q = prof[(n["zone"], lab)]
    base = n["load"]*q.lf - n["wind"]*q.cfw_r - n["pv"]*q.cfs_r     # + = Bezug aus HS, − = Rückspeisung
    return base

def calibrate(prof, headroom=1.0):
    """Knoten 'knapp belegt': Erzeugung (Wind/PV-Verhältnis fest) bzw. Last so skaliert, dass der
    extremste Lastfluss ohne Speicher über Juni–Juli + Okt–17.11.2026 genau L/headroom erreicht."""
    target = L * headroom  # 1.0 = knapp belegt, 1.25 = heute schon 25 % über L, 0.9 = 10 % Reserve
    for key, n in NODES.items():
        if key == "stadt":
            mx = max(node_series(key, prof, lab).max() for lab in ("herbst", "sommer"))
            f = 1.0
            for _ in range(60):
                n2 = dict(n); n2["load"] = n["load"] * f; NODES[key] = n2
                mx = max(node_series(key, prof, lab).max() for lab in ("herbst", "sommer"))
                f *= target / mx
        else:
            f = 1.0
            for _ in range(60):
                n2 = dict(n); n2["wind"] = n["wind"] * f; n2["pv"] = n["pv"] * f; NODES[key] = n2
                mn = min(node_series(key, prof, lab).min() for lab in ("herbst", "sommer"))
                f *= target / -mn if mn < 0 else 2
            n = NODES[key]
    return {k: {kk: (round(v, 1) if isinstance(v, float) else v) for kk, v in n.items()} for k, n in NODES.items()}

def run(factors=(1, 2, 5, 10), lim=L, tag="haupt", headroom=1.0):
    nat, price = national(); prof = profiles(nat)
    nodes_used = calibrate(prof, headroom)
    peak_nat = nat["Load"][nat["Load"].index >= pd.Timestamp("2026-10-01", tz=TZ)].max()
    share = lim / peak_nat
    rows, curves = [], {}
    for lab in ("herbst", "sommer"):
        for key in NODES:
            base = node_series(key, prof, lab)
            df = pd.DataFrame({"base": base, "p": price}).dropna()
            df["day"] = df.index.tz_convert(TZ).date
            for k in factors:
                P, E = k*FLEET_P*share, k*FLEET_E*share
                for day, g in df.groupby("day"):
                    if len(g) < 92: continue
                    p, bse = g.p.values, g.base.values
                    cm, dm, Rm = solve_day(p, bse, P, E)
                    ck, dk, Rk = solve_day(p, bse, P, E, lim)
                    fm, fk = bse + cm - dm, bse + ck - dk
                    def over(f): return (np.abs(f) > lim + 1e-6) & (np.abs(f) > np.abs(bse) + 1e-6)
                    rows.append(dict(saison=lab, node=key, k=k, day=str(day), P=P, E=E,
                        qh_base=int((np.abs(bse) > lim).sum()), qh_markt=int(over(fm).sum()), qh_knoten=int(over(fk).sum()),
                        mwh_markt=float(np.clip(np.abs(fm) - np.maximum(lim, np.abs(bse)), 0, None).sum()*0.25),
                        R_markt=Rm, R_knoten=Rk,
                        relief_markt=float(np.clip(np.abs(bse)-lim,0,None).sum()*0.25 - np.clip(np.abs(fm)-lim,0,None)[np.abs(bse)>lim].sum()*0.25),
                        relief_knoten=float(np.clip(np.abs(bse)-lim,0,None).sum()*0.25 - np.clip(np.abs(fk)-lim,0,None)[np.abs(bse)>lim].sum()*0.25),
                        base_max=float(bse.max()), base_min=float(bse.min())))
                    curves[(lab, key, k, str(day))] = dict(t=[str(x) for x in g.index.tz_convert(TZ)], base=bse.tolist(),
                        fm=fm.tolist(), fk=fk.tolist(), p=p.tolist())
    res = pd.DataFrame(rows); res.to_csv(f"{OUT}/tage_{tag}.csv", index=False)
    json.dump({"|".join(map(str, k)): v for k, v in curves.items()}, open(f"{OUT}/kurven_{tag}.json", "w"))
    json.dump(dict(peak_nat_mw=float(peak_nat), share=share, L=lim, headroom=headroom, nodes=nodes_used), open(f"{OUT}/meta_{tag}.json", "w"))
    return res

if __name__ == "__main__":
    import sys
    headroom = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
    tag = sys.argv[2] if len(sys.argv) > 2 else "haupt"
    r = run(tag=tag, headroom=headroom)
    g = r.groupby(["saison", "node", "k"]).agg(tage=("day", "count"), qh_base=("qh_base", "sum"), qh_markt=("qh_markt", "sum"),
        tage_konflikt=("qh_markt", lambda s: int((s > 0).sum())), qh_knoten=("qh_knoten", "sum"), mwh=("mwh_markt", "sum"),
        Rm=("R_markt", "sum"), Rk=("R_knoten", "sum"), relm=("relief_markt", "sum"), relk=("relief_knoten", "sum"), P=("P", "first"), E=("E", "first"))
    g["verlust_pct"] = (g.Rm - g.Rk) / g.Rm * 100
    pd.set_option("display.width", 250); print(g.round(2)); g.to_csv(f"{OUT}/summe_{tag}.csv")
    print(json.load(open(f"{OUT}/meta_{tag}.json")))
