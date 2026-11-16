import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { additionalFleetMw } from "@/lib/research/fleetBasis";
import { solvePeakShaveDispatch } from "@/lib/research/nationalPeakShaveEngine";
import { PEAK_LEX_TOLERANCE_MW, storageLpCliAvailable } from "@/lib/research/nationalStorageLp";

const highspy =
  spawnSync("python3", ["-c", "import highspy"], { encoding: "utf8" }).status === 0;

const EVENING_START_H = 17;
const PY = join(process.cwd(), "artifacts/october-storage-counterfactual-20261107");

function runMipOld(residual: number[], powerMw: number, energyMwh: number) {
  const script = `
import json, sys, numpy as np
sys.path.insert(0, ${JSON.stringify(PY)})
from mip_month import MonthStorageMip
p = json.load(sys.stdin)
r = np.array(p["residualMw"], float)
m = MonthStorageMip(len(r), p["powerMw"], p["energyMwh"])
c,d,e,_ = m.solve_min_peak(r)
print(json.dumps({"cMw": c.tolist(), "dMw": d.tolist()}))
`;
  const child = spawnSync("python3", ["-c", script], {
    input: JSON.stringify({ residualMw: residual, powerMw, energyMwh }),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (child.status !== 0) throw new Error(child.stderr || child.stdout);
  const jsonLine = child.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .pop();
  if (!jsonLine) throw new Error(`no JSON in mip stdout: ${child.stdout.slice(0, 200)}`);
  return JSON.parse(jsonLine) as { cMw: number[]; dMw: number[] };
}

function stdChargeOutsideEvening(cMw: number[], timestamps: string[]): number {
  const outside: number[] = [];
  for (let i = 0; i < cMw.length; i += 1) {
    const hour = Number.parseInt(timestamps[i]!.slice(11, 13), 10);
    if (hour < EVENING_START_H) outside.push(cMw[i]!);
  }
  if (outside.length < 2) return 0;
  const mean = outside.reduce((a, b) => a + b, 0) / outside.length;
  const variance = outside.reduce((a, b) => a + (b - mean) ** 2, 0) / outside.length;
  return Math.sqrt(variance);
}

function sumChargeMwh(c: number[]): number {
  return c.reduce((a, b) => a + b, 0) * 0.25;
}

describe("nationalPeakShaveEngine · lex Stufe 2 (flaches Laden)", () => {
  (highspy && storageLpCliAvailable() ? it : it.skip)(
    "gleiche Spitze, weniger und flacheres Laden (29.10.2026 ×5, Tages-MIP)",
    () => {
      const run = JSON.parse(
        readFileSync(
          join(process.cwd(), "data/national-fleet/2026-10/runs/x5_min_peak_perfect_foresight.json"),
          "utf8",
        ),
      ) as { timestamp_berlin: string[]; r_mw: number[] };
      const day = "2026-10-29";
      const idx: number[] = [];
      for (let i = 0; i < run.timestamp_berlin.length; i += 1) {
        if (run.timestamp_berlin[i]!.startsWith(day)) idx.push(i);
      }
      const residual = idx.map((i) => run.r_mw[i]!);
      const ts = idx.map((i) => run.timestamp_berlin[i]!);
      const { powerMw, energyMwh } = additionalFleetMw(5);
      const old = runMipOld(residual, powerMw, energyMwh);
      const neu = solvePeakShaveDispatch(residual, powerMw, energyMwh);
      const oldRp = residual.map((r, t) => r + old.cMw[t]! - old.dMw[t]!);
      expect(Math.abs(Math.max(...neu.rPrimeMw) - Math.max(...oldRp))).toBeLessThanOrEqual(
        PEAK_LEX_TOLERANCE_MW + 0.01,
      );
      expect(Math.max(...neu.cMw)).toBeLessThan(Math.max(...old.cMw) - 100);
      expect(sumChargeMwh(neu.cMw)).toBeLessThan(sumChargeMwh(old.cMw));
      expect(stdChargeOutsideEvening(neu.cMw, ts)).toBeLessThan(stdChargeOutsideEvening(old.cMw, ts));
    },
  );
});