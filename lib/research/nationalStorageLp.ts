/**
 * LP-Aufruf für Modellflotte (Stufe 2 / volle Fahrpläne).
 * Laufzeit: bevorzugt SciPy-HiGHS (CLI), identisch mip_month._solve_peak_flat_lp.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  RESEARCH_DISPATCH_RTE,
  RESEARCH_QUARTER_H,
} from "@/lib/research/fleetBasis";

export const PEAK_LEX_TOLERANCE_MW = 0.05;
export const CHARGE_SMOOTH_MWH_PER_MW_RAMP = 0.05;

const PY_CLI = join(
  process.cwd(),
  "artifacts/october-storage-counterfactual-20261107/solve_storage_lp_cli.py"
);

export type StorageLpSolveMode = "peak" | "peak_flat" | "peak_lex";

export type StorageLpDispatch = {
  cMw: number[];
  dMw: number[];
  peakMw: number;
  peakStage1Mw?: number;
  peakToleranceMw?: number;
  status: string;
};

type CliPayload = {
  mode: StorageLpSolveMode;
  residualMw: number[];
  powerMw: number;
  energyMwh: number;
  peakUbMw?: number;
};

function cliAvailable(): boolean {
  if (!existsSync(PY_CLI)) return false;
  const probe = spawnSync("python3", ["-c", "import scipy, numpy"], { encoding: "utf8" });
  return probe.status === 0;
}

export function storageLpCliAvailable(): boolean {
  return cliAvailable();
}

function runCli(payload: CliPayload): StorageLpDispatch {
  if (!cliAvailable()) {
    throw new Error(
      "SciPy-LP nicht verfügbar (python3 + scipy). Für Tests: gleiche Logik in CI über Fixtures."
    );
  }
  const child = spawnSync("python3", [PY_CLI], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout || `LP-CLI exit ${child.status}`);
  }
  return JSON.parse(child.stdout) as StorageLpDispatch;
}

export function solveStorageLp(
  residualMw: number[],
  powerMw: number,
  energyMwh: number,
  mode: Exclude<StorageLpSolveMode, "peak_lex">,
  options?: { peakUbMw?: number }
): StorageLpDispatch {
  if (powerMw <= 0 || energyMwh <= 0 || residualMw.length === 0) {
    const peakMw = residualMw.length ? Math.max(...residualMw) : 0;
    return {
      cMw: residualMw.map(() => 0),
      dMw: residualMw.map(() => 0),
      peakMw,
      status: "trivial_zero_fleet",
    };
  }
  return runCli({
    mode,
    residualMw,
    powerMw,
    energyMwh,
    peakUbMw: options?.peakUbMw,
  });
}

export function solveMinPeakFlatLex(
  residualMw: number[],
  powerMw: number,
  energyMwh: number
): StorageLpDispatch & { peakStage1Mw: number; peakToleranceMw: number } {
  if (powerMw <= 0 || energyMwh <= 0 || residualMw.length === 0) {
    const peakMw = residualMw.length ? Math.max(...residualMw) : 0;
    return {
      cMw: residualMw.map(() => 0),
      dMw: residualMw.map(() => 0),
      peakMw,
      peakStage1Mw: peakMw,
      peakToleranceMw: PEAK_LEX_TOLERANCE_MW,
      status: "trivial_zero_fleet",
    };
  }
  const out = runCli({
    mode: "peak_lex",
    residualMw,
    powerMw,
    energyMwh,
  });
  return {
    ...out,
    peakStage1Mw: out.peakStage1Mw ?? out.peakMw,
    peakToleranceMw: out.peakToleranceMw ?? PEAK_LEX_TOLERANCE_MW,
  };
}

export const STORAGE_LP_RTE = RESEARCH_DISPATCH_RTE;
export const STORAGE_LP_DT_H = RESEARCH_QUARTER_H;