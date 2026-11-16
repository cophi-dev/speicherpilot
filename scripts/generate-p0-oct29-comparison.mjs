#!/usr/bin/env node
/**
 * Vorher/Nachher 29.10.2026 ×5 Spitze → PNG + metrics JSON unter review-artifacts/p0-flach-laden/
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const OUT = join(process.cwd(), "review-artifacts/p0-flach-laden");
const RUN = join(process.cwd(), "data/national-fleet/2026-10/runs/x5_min_peak_perfect_foresight.json");
const DAY = "2026-10-29";

mkdirSync(OUT, { recursive: true });

const run = JSON.parse(readFileSync(RUN, "utf8"));
const idx = [];
for (let i = 0; i < run.timestamp_berlin.length; i += 1) {
  if (run.timestamp_berlin[i].startsWith(DAY)) idx.push(i);
}
const residual = idx.map((i) => run.r_mw[i]);
const ts = idx.map((i) => run.timestamp_berlin[i]);

const fleet = { factor: 5, basePowerMw: 4644.09022, baseEnergyMwh: 8152.4588 };
const powerMw = (fleet.factor - 1) * fleet.basePowerMw;
const energyMwh = (fleet.factor - 1) * fleet.baseEnergyMwh;

function cli(mode, extra = {}) {
  const py = join(process.cwd(), "artifacts/october-storage-counterfactual-20261107/solve_storage_lp_cli.py");
  const child = spawnSync(
    "python3",
    [py],
    {
      input: JSON.stringify({ mode, residualMw: residual, powerMw, energyMwh, ...extra }),
      encoding: "utf8",
    },
  );
  if (child.status !== 0) throw new Error(child.stderr || child.stdout);
  return JSON.parse(child.stdout);
}

function minPeakGreedy(residual) {
  let lo = Math.min(...residual);
  let hi = Math.max(...residual);
  for (let k = 0; k < 50; k += 1) {
    const mid = (lo + hi) / 2;
    if (feasible(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

function feasible(cap) {
  const eta = Math.sqrt(0.85);
  const dt = 0.25;
  let soc = 0.5 * energyMwh;
  const lo = 0.1 * energyMwh;
  const hi = 0.9 * energyMwh;
  for (const r of residual) {
    if (r > cap) {
      const d = r - cap;
      if (d > powerMw + 1e-6) return false;
      soc -= (d * dt) / eta;
      if (soc < lo - 1e-4) return false;
    } else {
      const c = Math.min(powerMw, cap - r);
      soc = Math.min(hi, soc + c * dt * eta);
    }
  }
  return soc >= 0.5 * energyMwh - 1e-4;
}

function legacyGreedy(cap) {
  const eta = Math.sqrt(0.85);
  const dt = 0.25;
  let soc = 0.5 * energyMwh;
  const lo = 0.1 * energyMwh;
  const hi = 0.9 * energyMwh;
  const c = [];
  const d = [];
  for (const r of residual) {
    if (r > cap) {
      const dis = Math.min(powerMw, r - cap);
      d.push(dis);
      c.push(0);
      soc -= (dis * dt) / eta;
      soc = Math.max(lo, soc);
    } else {
      const ch = Math.min(powerMw, cap - r);
      c.push(ch);
      d.push(0);
      soc = Math.min(hi, soc + ch * dt * eta);
    }
  }
  return { c, d };
}

const cap = minPeakGreedy(residual);
const old = legacyGreedy(cap);
const neu = cli("peak_lex");
const oldRp = residual.map((r, t) => r + old.c[t] - old.d[t]);
const neuRp = residual.map((r, t) => r + neu.cMw[t] - neu.dMw[t]);

const eveningH = 17;
const outsideStd = (rp) => {
  const xs = [];
  for (let i = 0; i < rp.length; i += 1) {
    const h = Number.parseInt(ts[i].slice(11, 13), 10);
    if (h < eveningH) xs.push(rp[i]);
  }
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

const metrics = {
  day: DAY,
  factor: 5,
  strategy: "bundesweite Restlast-Spitze (min_peak_perfect_foresight)",
  peakBeforeMw: Math.max(...residual),
  peakAfterOldMw: Math.max(...oldRp),
  peakAfterNewMw: Math.max(...neuRp),
  peakIdenticalMw: Math.max(...neuRp),
  maxChargeOldMw: Math.max(...old.c),
  maxChargeNewMw: Math.max(...neu.cMw),
  sumChargeOldMwh: old.c.reduce((a, b) => a + b, 0) * 0.25,
  sumChargeNewMwh: neu.cMw.reduce((a, b) => a + b, 0) * 0.25,
  stdChargeOutsideEveningOldMw: outsideStd(old.c),
  stdChargeOutsideEveningNewMw: outsideStd(neu.cMw),
  lexToleranceMw: 0.05,
};

writeFileSync(join(OUT, "oct29-x5-metrics.json"), JSON.stringify(metrics, null, 2));

const pyPlot = `
import json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path

OUT = Path(${JSON.stringify(OUT)})
metrics = json.loads((OUT / 'oct29-x5-metrics.json').read_text())
residual = ${JSON.stringify(residual)}
old_rp = ${JSON.stringify(oldRp)}
neu_rp = ${JSON.stringify(neuRp)}
hours = list(range(len(residual)))
fig, ax = plt.subplots(figsize=(12, 4.5), dpi=120)
ax.plot(hours, [x/1000 for x in residual], color='#888', lw=1.2, label='R gemessen (GW)')
ax.plot(hours, [x/1000 for x in old_rp], color='#c44', lw=1.0, ls='--', label="R' alt (Greedy)")
ax.plot(hours, [x/1000 for x in neu_rp], color='#164', lw=1.2, label="R' neu (lex flach)")
ax.set_xlabel('Viertelstunde (0 = 00:00)')
ax.set_ylabel('Restlast / R\\' (GW)')
ax.set_title('29.10.2026 · ×5 · Spitze — Vorher/Nachher (Modell)')
ax.legend(loc='upper left')
txt = (
    f"Spitze identisch: {metrics['peakAfterNewMw']/1000:.3f} GW\\n"
    f"max Laden alt/neu: {metrics['maxChargeOldMw']:.0f} / {metrics['maxChargeNewMw']:.0f} MW\\n"
    f"Σ Laden alt/neu: {metrics['sumChargeOldMwh']:.0f} / {metrics['sumChargeNewMwh']:.0f} MWh\\n"
    f"σ Laden außerhalb 17h: {metrics['stdChargeOutsideEveningOldMw']:.0f} / {metrics['stdChargeOutsideEveningNewMw']:.0f} MW"
)
ax.text(0.99, 0.97, txt, transform=ax.transAxes, ha='right', va='top', fontsize=8,
        bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
fig.tight_layout()
fig.savefig(OUT / 'oct29-x5-spitze-vorher-nachher.png')
print('wrote', OUT / 'oct29-x5-spitze-vorher-nachher.png')
`;

const plotPath = join(OUT, "_plot.py");
writeFileSync(plotPath, pyPlot);
const plot = spawnSync("python3", [plotPath], { encoding: "utf8" });
if (plot.status !== 0) {
  console.error(plot.stderr || plot.stdout);
  process.exit(1);
}

const png = readFileSync(join(OUT, "oct29-x5-spitze-vorher-nachher.png"));
writeFileSync(
  join(OUT, "manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      metricsFile: "oct29-x5-metrics.json",
      pngSha256: createHash("sha256").update(png).digest("hex"),
      metrics,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(metrics, null, 2));