#!/usr/bin/env node
/**
 * Bündelt Simulator-Rechnung v1 (×2) in data/national-fleet/2026-10/simulator-fahrweisen.json
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rech = join(root, "docs/research/simulator_v1/rechnung");
const outPath = join(root, "data/national-fleet/2026-10/simulator-fahrweisen.json");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i];
    });
    return row;
  });
}

function num(v) {
  return Number(v);
}

function uniqueFront(rowsFac, minDredMw = 0.15, minDrev = 15) {
  const pts = rowsFac.filter((r) =>
    ["market_lex", "netz_lex", "lam_grid", "dichotomy", "eps50", "eps70", "eps90"].includes(r.source),
  );
  pts.sort((a, b) => num(a.reduction_mw) - num(b.reduction_mw) || num(b.revenue_eur) - num(a.revenue_eur));
  const uniq = [];
  for (const p of pts) {
    if (!uniq.length) {
      uniq.push(p);
      continue;
    }
    const last = uniq[uniq.length - 1];
    if (
      Math.abs(num(p.reduction_mw) - num(last.reduction_mw)) < minDredMw &&
      Math.abs(num(p.revenue_eur) - num(last.revenue_eur)) < minDrev
    ) {
      const pref = new Set(["market_lex", "netz_lex", "eps70", "eps50", "eps90"]);
      if (pref.has(p.source) && !pref.has(last.source)) {
        uniq[uniq.length - 1] = p;
      }
      continue;
    }
    uniq.push(p);
  }
  return uniq;
}

function loadDispatchDay(dayKey, mode) {
  const path = join(rech, "dispatch/daily", `${dayKey}_${mode}.csv`);
  const rows = parseCsv(readFileSync(path, "utf8"));
  return rows.map((r) => ({
    ts: r.timestamp_berlin,
    residualMw: num(r.residual_mw),
    residualPrimeMw: num(r.residual_prime_mw),
    chargeMw: num(r.c_mw),
    dischargeMw: num(r.d_mw),
    priceEurMwh: num(r.day_ahead_eur_mwh),
    socMwh: num(r.soc_mwh),
  }));
}

const paretoRows = parseCsv(readFileSync(join(rech, "pareto_punkte.csv"), "utf8"));
const fac2 = paretoRows.filter((r) => num(r.factor) === 2);
const frontRaw = uniqueFront(fac2);
const marketLex = fac2.find((r) => r.source === "market_lex");
const netzLex = fac2.find((r) => r.source === "netz_lex");
const eps70 = fac2.find((r) => r.source === "eps70");
const fnavLex = fac2.find((r) => r.source === "fnav_lex");

const front = frontRaw.map((p, index) => ({
  index,
  source: p.source,
  name: p.name,
  revenueMioEur: num(p.revenue_mio_eur),
  reductionGw: num(p.reduction_gw),
  peakGw: num(p.peak_gw),
  peakTs: p.peak_ts,
  isMarketLex: p.source === "market_lex",
  isNetzLex: p.source === "netz_lex",
  isEps70: p.source === "eps70",
  isEps50: p.source === "eps50",
  isEps90: p.source === "eps90",
}));

const defaultIndex = front.findIndex((p) => p.isEps70);
if (defaultIndex < 0) {
  throw new Error("eps70 not on front");
}

const tagesklassen = parseCsv(readFileSync(join(rech, "tagesklassen_oktober.csv"), "utf8")).map((r) => ({
  date: r.date,
  klasse: r.klasse,
  shareOfNetzReduction: num(r.share_of_netz_reduction),
  marketReductionGw: num(r.market_reduction_gw),
  netzReductionGw: num(r.netz_reduction_gw),
  marketRaisesPeak: r.market_raises_peak === "True",
  marketRevenueEur: num(r.market_revenue_eur),
}));

const fnavB = JSON.parse(readFileSync(join(rech, "fnavB.json"), "utf8"));
const kipppunktCsv = parseCsv(readFileSync(join(rech, "kipppunkt.csv"), "utf8"));
const paretoAll = paretoRows;
function peakGw(factor, mode) {
  const row = paretoAll.find((r) => num(r.factor) === factor && r.name.includes(mode));
  if (row) return num(row.peak_gw);
  const k = kipppunktCsv.find((r) => Math.abs(num(r.factor) - factor) < 0.05);
  if (k && mode === "price") return num(k.peak_gw);
  return null;
}
const kipFactors = [
  { factor: 1, marketPeakGw: 64.4059, netzPeakGw: 64.4059 },
  { factor: 2, marketPeakGw: peakGw(2, "price_lex") ?? 64.04, netzPeakGw: peakGw(2, "peak_lex") ?? 60.82 },
  { factor: 3.8, marketPeakGw: num(kipppunktCsv.find((r) => r.factor === "3.8")?.peak_gw ?? 64.0401), netzPeakGw: 60.82 },
  { factor: 3.9, marketPeakGw: num(kipppunktCsv.find((r) => r.factor === "3.9")?.peak_gw ?? 64.428361638), netzPeakGw: 60.82 },
  { factor: 5, marketPeakGw: peakGw(5, "price_lex") ?? 69.54, netzPeakGw: peakGw(5, "peak_lex") ?? 54.99 },
  { factor: 10, marketPeakGw: peakGw(10, "price_lex") ?? 92.7569, netzPeakGw: peakGw(10, "peak_lex") ?? 50.4265 },
];

const payload = {
  version: 1,
  monthKey: "2026-10",
  fleet: { powerMw: 4644.09022, energyMwh: 8152.4588, factor: 2, convention: "a" },
  baselinePeakGw: 64.4059,
  euroLabel: "Modellschätzung",
  endpoints: {
    marketLex: pickEndpoint(marketLex),
    netzLex: pickEndpoint(netzLex),
    eps70: pickEndpoint(eps70),
    fnavTimeWindow: pickEndpoint(fnavLex),
    cap62Gw: {
      revenueMioEur: fnavB["2_cap62"].revenue_mio_eur,
      reductionGw: fnavB["2_cap62"].reduction_gw,
      peakGw: fnavB["2_cap62"].peak_gw,
    },
    capBaselineGw: {
      revenueMioEur: fnavB["2"].revenue_mio_eur,
      reductionGw: fnavB["2"].reduction_gw,
      peakGw: fnavB["2"].peak_gw,
    },
    solverArtefactNote:
      "Ein reiner Spitzen-Löser liefert bei ×2 einen „Erlös“ von −3,08 Mio. € — Löser-Artefakt, kein Netz-Endpunkt.",
  },
  front,
  defaultIndex,
  namedIndices: {
    markt: front.findIndex((p) => p.isMarketLex),
    kompromiss: defaultIndex,
    netzdienlich: front.findIndex((p) => p.isNetzLex),
  },
  tagesklassen,
  tagesklassenSummary: {
    winWin: 0,
    neutral: tagesklassen.filter((d) => d.klasse === "neutral").length,
    konfliktSchwach: tagesklassen.filter((d) => d.klasse === "konflikt_schwach").length,
    konfliktHebung: tagesklassen.filter((d) => d.klasse === "konflikt_hebung").length,
    maxShare: Math.max(...tagesklassen.map((d) => d.shareOfNetzReduction)),
    maxShareDate: tagesklassen.reduce((a, b) =>
      a.shareOfNetzReduction >= b.shareOfNetzReduction ? a : b,
    ).date,
  },
  kipppunkt: {
    factorApprox: 3.9,
    analyticalMw: 64428,
    referenceMw: 64405.9,
    factors: kipFactors,
  },
  exampleDays: {
    "2026-10-21": {
      modes: {
        price: loadDispatchDay("2026-10-21", "price"),
        peak: loadDispatchDay("2026-10-21", "peak"),
        eps70: loadDispatchDay("2026-10-21", "eps70"),
      },
    },
    "2026-10-29": {
      modes: {
        price: loadDispatchDay("2026-10-29", "price"),
        peak: loadDispatchDay("2026-10-29", "peak"),
        eps70: loadDispatchDay("2026-10-29", "eps70"),
      },
    },
  },
  meta: JSON.parse(readFileSync(join(rech, "meta.json"), "utf8")),
};

const json = JSON.stringify(payload);
payload.sha256 = createHash("sha256").update(json).digest("hex");
writeFileSync(outPath, JSON.stringify(payload, null, 0));
console.log(`Wrote ${outPath} (${(json.length / 1024).toFixed(0)} KiB), front=${front.length}, sha256=${payload.sha256.slice(0, 12)}…`);

function pickEndpoint(row) {
  return {
    revenueMioEur: num(row.revenue_mio_eur),
    reductionGw: num(row.reduction_gw),
    peakGw: num(row.peak_gw),
    peakTs: row.peak_ts,
  };
}
