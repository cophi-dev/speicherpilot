/**
 * @jest-environment node
 */
import { execSync } from "node:child_process";
import { cpSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import fixture from "@/lib/__fixtures__/auffaelligkeit-records.json";
import type { TagesKennzahlRecord } from "@/lib/auffaelligkeit";
import { auditBadgeV2 } from "@/lib/badgeV2Audit";
import { assessConnectionGridBadge } from "@/lib/connectionGridBadge";
import {
  addBerlinCalendarDays,
  findFirstUnixSecondForBerlinDateKey,
  getBerlinDateKeyFromUnixSeconds,
} from "@/lib/berlinCalendar";
import { chainFleetSoc, CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { verifySurplusDispatchEnergyBalance } from "@/lib/dispatchEnergyBalance";
import type { GermanyDispatchSlot } from "@/lib/energyChartsApi";
import { evaluateSurplusDayFactor } from "@/lib/surplusDaySimulation";
import { archetypeByKey } from "@/lib/ortArchetypes";
import type { OrtMode } from "@/lib/ortArchetypesSchema";
import { MORE_STORAGE_DISCHARGE_HOUR, MORE_STORAGE_ROUND_TRIP } from "@/lib/moreStorage";
import { berlinMonthKeyFromDateKey, buildMonatGrid, daysInBerlinMonth, formatBerlinMonthLabel } from "@/lib/monatCalendar";
import { barsFromMonatGrid } from "@/lib/monatSurplusBars";
import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import type { ResidualDay, ResidualSlot } from "@/lib/windSolarResidual";
import { auditOrtStorageDispatch } from "@/lib/ortStorageDispatchAudit";
import { exportNationalDayEvidence } from "@/lib/exportLaunchNationalDays";
import { auditNationalFactorRun, expectedNationalCaps } from "@/lib/nationalFactorGate";

const BUNDLE_ID =
  process.env.LAUNCH_R4_STAMP != null
    ? `launch-r4-${process.env.LAUNCH_R4_STAMP}`
    : `launch-r4-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
const ARTIFACT_DIR = join(process.cwd(), "artifacts", BUNDLE_ID);
const MIRROR_ROOT = "/opt/cursor/artifacts";
const ARCHETYPES: Array<"land" | "stadt"> = ["land", "stadt"];
const MODES: OrtMode[] = ["markt", "vertrag", "netz"];
const DT_H = 0.25;

type PriceDayRow = { date: string; prices: number[] };

function loadPriceDays(): PriceDayRow[] {
  const root = JSON.parse(readFileSync(join(process.cwd(), "data/fca/prices-12m.json"), "utf8")) as {
    days: PriceDayRow[];
  };
  return root.days;
}

function pricesForDay(days: PriceDayRow[], date: string): number[] {
  const row = days.find((d) => d.date === date);
  if (!row || row.prices.length < 1) {
    throw new Error(`kein Day-Ahead-Preistag ${date} in prices-12m.json`);
  }
  return row.prices.slice(0, 96);
}

function countSimultaneousChargeDischarge(chargeMw: number[], dischargeMw: number[]): number {
  let count = 0;
  const n = Math.min(chargeMw.length, dischargeMw.length);
  for (let i = 0; i < n; i += 1) {
    if (chargeMw[i] > 1e-4 && dischargeMw[i] > 1e-4) {
      count += 1;
    }
  }
  return count;
}

function revenueEurTyptag(prices: number[], chargeMw: number[], dischargeMw: number[]): number {
  let total = 0;
  const n = Math.min(prices.length, chargeMw.length, dischargeMw.length);
  for (let i = 0; i < n; i += 1) {
    total += prices[i] * DT_H * (dischargeMw[i] - chargeMw[i]);
  }
  return total;
}

function recomputeL1n1(
  l0: number[],
  charge: number[],
  discharge: number[],
  betaCharge: number,
  betaDischarge: number,
): number[] {
  return l0.map((base, i) =>
    Math.round(
      Math.max(0, base + betaCharge * (charge[i] ?? 0) + betaDischarge * (discharge[i] ?? 0)) * 100,
    ) / 100,
  );
}

function loadingBetasFromPhysics(physics: Record<string, unknown> | null | undefined): {
  betaCharge: number;
  betaDischarge: number;
  formula: string;
} {
  const p = physics ?? {};
  const betaCharge =
    typeof p.betaChargePpPerMwN1 === "number"
      ? p.betaChargePpPerMwN1
      : typeof p.betaN1 === "number"
        ? p.betaN1
        : 0;
  const betaDischarge =
    typeof p.betaDischargePpPerMwN1 === "number"
      ? p.betaDischargePpPerMwN1
      : typeof p.betaN1 === "number"
        ? -p.betaN1
        : 0;
  const formula =
    typeof p.loadingLinearModel === "string"
      ? p.loadingLinearModel
      : "L1n1_pp = max(0, L0_n1_pp + betaCharge*c + betaDischarge*d)";
  return { betaCharge, betaDischarge, formula };
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function gitHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function berlinHm(unixSeconds: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(unixSeconds * 1000));
}

function exportDstSeries(dayKey: string) {
  const start = findFirstUnixSecondForBerlinDateKey(dayKey);
  const rows: Array<{
    index: number;
    unixSeconds: number;
    utcIso: string;
    berlinDate: string;
    berlinHm: string;
    dtHours: number;
  }> = [];
  for (let s = start, index = 0; s < start + 36 * 3600; s += 15 * 60, index += 1) {
    const berlinDate = getBerlinDateKeyFromUnixSeconds(s);
    if (berlinDate !== dayKey) {
      break;
    }
    rows.push({
      index,
      unixSeconds: s,
      utcIso: new Date(s * 1000).toISOString(),
      berlinDate,
      berlinHm: berlinHm(s),
      dtHours: DT_H,
    });
  }
  const integratedDummyMw = rows.length * DT_H;
  return { dayKey, slotCount: rows.length, integratedPlaceholderMwhPerMw: integratedDummyMw, slots: rows };
}

function slot(partial: Partial<GermanyDispatchSlot> & Pick<GermanyDispatchSlot, "timestampIso" | "hourBerlin">): GermanyDispatchSlot {
  return {
    residualLoadMw: 0,
    loadMw: 30_000,
    totalGenerationMw: 40_000,
    renewableGenerationMw: 35_000,
    windOnshoreMw: 5_000,
    windOffshoreMw: 2_000,
    solarMw: 3_000,
    windSolarMw: 10_000,
    crossBorderElectricityTradingMw: 0,
    curtailmentMw: null,
    ...partial,
  };
}

function residualSlot(date: string, hour: number, loadMw: number, windMw: number, solarMw: number): ResidualSlot {
  return {
    timestampIso: `${date}T${String(hour).padStart(2, "0")}:00:00+01:00`,
    hourBerlin: hour,
    minuteBerlin: 0,
    loadMw,
    windMw,
    solarMw,
  };
}

describe("Launch-Abnahme (Zeitreihen + Gegenrechnung)", () => {
  const records = fixture as TagesKennzahlRecord[];

  it("writes R4 evidence bundle under artifacts/launch-r4-*", async () => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const sourceCommit = gitHead();

    const surplusSlots: GermanyDispatchSlot[] = [
      slot({
        timestampIso: "2026-10-25T11:00:00+01:00",
        hourBerlin: 11,
        loadMw: 10_000,
        windOnshoreMw: 25_000,
        windOffshoreMw: 5_000,
        solarMw: 5_000,
        windSolarMw: 35_000,
      }),
      slot({
        timestampIso: "2026-10-25T18:00:00+01:00",
        hourBerlin: 18,
        loadMw: 55_000,
        windOnshoreMw: 8_000,
        windOffshoreMw: 2_000,
        solarMw: 0,
        windSolarMw: 10_000,
      }),
    ];
    const noSurplusSlots: GermanyDispatchSlot[] = [
      slot({
        timestampIso: "2026-11-02T12:00:00+01:00",
        hourBerlin: 12,
        loadMw: 50_000,
        windOnshoreMw: 5_000,
        windSolarMw: 8_000,
      }),
    ];
    const fleet = { powerMw: 4_580, energyMwh: 8_000 };

    const daySurplus = evaluateSurplusDayFactor(surplusSlots, fleet, 1);
    const dayDry = evaluateSurplusDayFactor(noSurplusSlots, fleet, 1);
    const balanceSurplus = verifySurplusDispatchEnergyBalance(daySurplus.quarters);
    const balanceDry = verifySurplusDispatchEnergyBalance(dayDry.quarters);

    const capacityLimit = evaluateSurplusDayFactor(
      Array.from({ length: 12 }, (_, i) =>
        slot({
          timestampIso: `2026-05-07T10:${String((i * 15) % 60).padStart(2, "0")}:00+02:00`,
          hourBerlin: 10 + Math.floor((i * 15) / 60),
          loadMw: 5_000,
          windOnshoreMw: 30_000,
          windSolarMw: 35_000,
        }),
      ),
      { powerMw: 50_000, energyMwh: 80 },
      1,
    );

    const dispatchEvidence = {
      sourceCommit,
      convention: {
        rteOnDischargeOnly: ROUND_TRIP_EFFICIENCY,
        socWindowFraction: [CHAIN_SOC_MIN, CHAIN_SOC_MAX],
        chargeBeforeHourBerlin: MORE_STORAGE_DISCHARGE_HOUR,
        dtHours: DT_H,
        units: { power: "MW", energy: "MWh", surplus: "GWh in Tageskennzahl" },
      },
      cases: [
        {
          id: "surplus-partial-day",
          input: { fleetFactor1: fleet, slots: surplusSlots },
          output: {
            quarters: daySurplus.quarters,
            absorbedMwh: daySurplus.absorbedMwh,
            dischargedMwh: daySurplus.dischargedMwh,
            balanceMaxResidualMwh: balanceSurplus.maxResidualMwh,
          },
        },
        {
          id: "no-surplus",
          input: { fleetFactor1: fleet, slots: noSurplusSlots },
          output: {
            quarters: dayDry.quarters,
            absorbedMwh: dayDry.absorbedMwh,
            balanceMaxResidualMwh: balanceDry.maxResidualMwh,
          },
        },
        {
          id: "capacity-limit",
          output: {
            absorbedMwh: capacityLimit.absorbedMwh,
            nameplateEnergyMwh: capacityLimit.nameplateEnergyMwh,
            usableCapMwh: capacityLimit.nameplateEnergyMwh * (CHAIN_SOC_MAX - CHAIN_SOC_MIN),
          },
        },
      ],
    };

    const chainDay: ResidualDay = {
      dateBerlin: "2026-10-26",
      slots: [
        residualSlot("2026-10-26", 11, 0, 50_000, 50_000),
        residualSlot("2026-10-26", 18, 50_000, 4_000, 0),
      ],
    };
    const chain = chainFleetSoc([chainDay], 4_000, 8_000);
    const chainEvidence = {
      sourceCommit,
      roundTrip: MORE_STORAGE_ROUND_TRIP,
      startSocMwh: chain.startSocMwh,
      endSocMwh: chain.endSocMwh,
      chargedMwh: chain.chargedMwh,
      dischargedMwh: chain.dischargedMwh,
      balanceCheck:
        chain.startSocMwh + chain.chargedMwh - chain.dischargedMwh / MORE_STORAGE_ROUND_TRIP,
      points: chain.points.map((p) => ({
        timestampIso: p.timestampIso,
        unixSeconds: p.unixSeconds,
        dateBerlin: p.dateBerlin,
        chargeMw: p.chargeMw,
        dischargeMw: p.dischargeMw,
        socFraction: p.soc,
        socMwh: p.socMwh,
      })),
    };

    const monthKey = "2026-10";
    const monthDays = daysInBerlinMonth(monthKey);
    const monthRecords = records.filter((r) => berlinMonthKeyFromDateKey(r.dateKey) === monthKey);
    const sumSurplusGwh = monthRecords.reduce((s, r) => s + Math.max(0, r.surplusGwh), 0);
    const grid = buildMonatGrid({
      monthKey,
      records,
      todayKey: "2026-11-04",
      lastCompleteDayKey: "2026-11-03",
    });
    const bars = barsFromMonatGrid(grid);
    const graphSum = bars.reduce((s, b) => s + (b.surplusGwh ?? 0), 0);
    const missingDays = monthDays.filter((d) => !monthRecords.some((r) => r.dateKey === d));

    const monatEvidence = {
      sourceCommit,
      monthKey,
      monthLabel: formatBerlinMonthLabel(monthKey),
      daysInCalendar: monthDays.length,
      daysWithRecords: monthRecords.length,
      missingDayKeys: missingDays,
      sumSurplusGwhFromRecords: sumSurplusGwh,
      sumSurplusGwhFromGraphBars: graphSum,
      factorNote: "Euro nicht skaliert; Tageskennzahl surplusGwh aus Fixture",
      uiMonthLabelMustMatch: monthKey,
      dailyOriginalAndGraphPoints: bars.map((b) => ({
        dateKey: b.dateKey,
        surplusGwhFromRecord: b.surplusGwh,
        graphSurplusGwh: b.surplusGwh === null ? null : b.surplusGwh < 0.05 ? 0 : b.surplusGwh,
        future: b.future,
        missing: b.missing,
      })),
    };

    const monthNov = "2026-11";
    const asOfBerlin = "2026-11-07";
    const gridNov = buildMonatGrid({
      monthKey: monthNov,
      records,
      todayKey: asOfBerlin,
      lastCompleteDayKey: "2026-11-06",
    });
    const barsNov = barsFromMonatGrid(gridNov);
    const monatNovEvidence = {
      sourceCommit,
      bundleId: BUNDLE_ID,
      asOfBerlin,
      monthKey: monthNov,
      archivedComplete: false,
      daysInCalendar: daysInBerlinMonth(monthNov).length,
      daysWithRecords: records.filter((r) => berlinMonthKeyFromDateKey(r.dateKey) === monthNov).length,
      dailyOriginalAndGraphPoints: barsNov.map((b) => ({
        dateKey: b.dateKey,
        surplusGwhFromRecord: b.surplusGwh,
        graphSurplusGwh: b.surplusGwh === null ? null : b.surplusGwh < 0.05 ? 0 : b.surplusGwh,
        future: b.future,
        missing: b.missing,
      })),
    };

    const dst = {
      sourceCommit,
      spring: exportDstSeries("2025-03-30"),
      fall: exportDstSeries("2025-10-26"),
      fallTyptag2026: exportDstSeries("2026-10-25"),
      normal: exportDstSeries("2026-07-15"),
    };

    const priceDays = loadPriceDays();

    const netzExports = ARCHETYPES.flatMap((archKey) =>
      MODES.map((mode) => {
        const data = archetypeByKey(archKey);
        const series = data.series.modes[mode];
        const { betaCharge, betaDischarge, formula: loadingFormula } = loadingBetasFromPhysics(
          data.dispatchPhysics as Record<string, unknown> | undefined,
        );
        const l1Recomputed = recomputeL1n1(data.series.L0n1, series.c, series.d, betaCharge, betaDischarge);
        const maxL1RecomputeGap = Math.max(...series.L1n1.map((l1, i) => Math.abs(l1 - l1Recomputed[i])));
        const audit = auditBadgeV2({ L0n1: data.series.L0n1, L1n1: series.L1n1 });
        const storageAudit = auditOrtStorageDispatch({
          chargeMw: series.c,
          dischargeMw: series.d,
          socStartMwh: series.soc,
          energyMwh: data.storage.eMwh,
          powerMw: data.storage.pMw,
        });
        const dayPrices = pricesForDay(priceDays, data.priceDay);
        const revenueEur = revenueEurTyptag(dayPrices, series.c, series.d);
        const signedBatteryMw = series.d.map((d, i) => round4(d - series.c[i]));
        const loadingDeltaPp = data.series.L0n1.map((l0, i) => round4(l1Recomputed[i] - l0));
        return {
          file: `netz-${archKey}-${mode}-timeseries.json`,
          meta: {
            archetype: archKey,
            mode,
            syntheticExample: `SimBench-Typtag ${data.typtag}, Day-Ahead ${data.priceDay}; kein Messjahr`,
            voltageModeled:
              "vmin/vmax pandapower Typtag-Baseline ohne Speicher — keine Spannungswirkung des Batterie-Dispatch",
            dispatchPhysics: data.dispatchPhysics ?? null,
            loadingLinearModel: loadingFormula,
            betaChargePpPerMwN1: betaCharge,
            betaDischargePpPerMwN1: betaDischarge,
            bezugFestMw: data.xMw,
            einspeisFlexMw: data.yMw,
            storagePMw: data.storage.pMw,
            storageEMwh: data.storage.eMwh,
            socConvention:
              "MIP: Start 0,5·E, nutzbar 0,1·E…0,9·E; soc[] = SoC zu qh-Beginn; socEndMwh = nach letztem Intervall",
            solverMutualExclusiveChargeDischarge:
              "HiGHS-MIP: Binary z pro qh; c≤Pc·z, d≤Pd·(1−z); terminal SoC = Start",
            revenuePctVsMarkt: data.revenuePctTyptag[mode],
            revenueEurTyptag: round4(revenueEur),
            revenueUnit: "EUR/MWh Day-Ahead·0,25 h",
            revenueNote:
              "Prozent = Modellerlös am Mustertag relativ zum Markt-Modus am selben Tag (100 % Basis). Erlöse absolut nur bei gleichem End-SoC fair vergleichbar — siehe revenueFairness.",
            revenueFairness: {
              startSocMwh: round4(series.soc[0] ?? 0),
              endSocMwh: round4(storageAudit.socEndMwh),
              restEnergyMwhVsStart: round4(storageAudit.socEndMwh - (series.soc[0] ?? 0)),
              terminalSocEqualsStart: true,
            },
            storageDispatchAudit: storageAudit,
            badgeRule: audit.ruleSummary,
            badgeStoredInJson: data.badge[mode],
          },
          audit,
          pricesEurPerMwh: dayPrices.map((p) => round4(p)),
          series: {
            hour: data.series.hour,
            L0n0: data.series.L0n0,
            L0n1: data.series.L0n1,
            L1n1: series.L1n1,
            L1n1RecomputedFromDispatch: l1Recomputed.map((v) => round4(v)),
            maxL1RecomputeGapPp: round4(maxL1RecomputeGap),
            chargeMw: series.c,
            dischargeMw: series.d,
            signedBatteryMw,
            loadingDeltaPp,
            socStartMwh: series.soc,
            socEndMwh: round4(storageAudit.socEndMwh),
            vmin: series.vmin,
            vmax: series.vmax,
          },
        };
      }),
    );

    const ortRevenueCompare = ARCHETYPES.map((archKey) => {
      const data = archetypeByKey(archKey);
      const prices = pricesForDay(priceDays, data.priceDay);
      const modes = data.series.modes;
      const pick = (m: OrtMode) => {
        const s = modes[m];
        const audit = auditOrtStorageDispatch({
          chargeMw: s.c,
          dischargeMw: s.d,
          socStartMwh: s.soc,
          energyMwh: data.storage.eMwh,
          powerMw: data.storage.pMw,
        });
        return {
          revenueEurTyptag: round4(revenueEurTyptag(prices, s.c, s.d)),
          revenuePctVsMarkt: data.revenuePctTyptag[m],
          startSocMwh: round4(s.soc[0] ?? 0),
          endSocMwh: round4(audit.socEndMwh),
          storageDispatchAudit: audit,
        };
      };
      return { archetype: archKey, priceDay: data.priceDay, markt: pick("markt"), vertrag: pick("vertrag"), netz: pick("netz") };
    });

    const gridV1Sample = assessConnectionGridBadge({
      netKw: [400, 500, 300],
      chargeKw: [0, 0, 200],
      dischargeKw: [0, 100, 0],
      limitKw: 450,
    });

    const nationalDays = ["2026-10-24", "2026-10-02", "2026-10-25", "2025-03-30"];
    const nationalFiles: string[] = [];
    const nationalFactorAudit: Record<string, unknown> = {};
    for (const dayKey of nationalDays) {
      const pack = await exportNationalDayEvidence(dayKey, [1, 2, 5, 10]);
      const file = `national-day-${dayKey}.json`;
      writeFileSync(join(ARTIFACT_DIR, file), JSON.stringify(pack, null, 2));
      nationalFiles.push(file);
      for (const run of pack.factorRuns) {
        const errs = auditNationalFactorRun(run);
        nationalFactorAudit[`${dayKey}×${run.factor}`] = {
          expected: expectedNationalCaps(run.factor),
          observed: {
            nameplateEnergyMwh: run.nameplateEnergyMwh,
            nameplatePowerMw: run.nameplatePowerMw,
            usableEnergyCapMwh: run.usableEnergyCapMwh,
            maxSocMwhObserved: run.maxSocMwhObserved,
            absorbedMwh: run.absorbedMwh,
            dischargedMwh: run.dischargedMwh,
          },
          ok: errs.length === 0,
          errors: errs,
        };
      }
    }
    writeFileSync(join(ARTIFACT_DIR, "national-factor-gate.json"), JSON.stringify(nationalFactorAudit, null, 2));

    const readme = {
      bundleId: BUNDLE_ID,
      sourceCommit,
      generatedAt: new Date().toISOString(),
      generator: "lib/launchAbnahme.test.ts",
      mirrorPath: join(MIRROR_ROOT, BUNDLE_ID),
      supersededBundles: ["artifacts/launch-abnahme (R2; nicht für R3/R4 verwenden)"],
      rules: {
        ortNetzBadge: "ort-badge-v2 (see badge audits in netz-*-timeseries.json)",
        siteConnectionBadge: "grid-support v1 (60 % discharge in ≥90 % peak intervals, no new charge peak)",
        notMixed: "Ort /ort uses v2 only; /site connection uses v1 — documented separately",
      },
      files: [
        "dispatch-evidence.json",
        "chain-fleet-evidence.json",
        "monat-2026-10-aggregate.json",
        "monat-2026-11-partial.json",
        "ort-revenue-compare.json",
        "dst-timestamps.json",
        ...nationalFiles,
        "national-factor-gate.json",
        ...netzExports.map((n) => n.file),
        "grid-v1-sample.json",
      ],
      deprecatedNotEvidence: ["artifacts/launch-abnahme/*", "pruefmatrix.json"],
      tolerances: { socResidualMwh: 1e-4, gwh: 0.02 },
      ui: {
        monatPrimaryGraph: readFileSync(join(process.cwd(), "components/home/MonatPageV4.tsx"), "utf8").includes(
          "MonatSurplusGraph",
        ),
      },
    };

    writeFileSync(join(ARTIFACT_DIR, "README-evidence.json"), JSON.stringify(readme, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "dispatch-evidence.json"), JSON.stringify(dispatchEvidence, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "chain-fleet-evidence.json"), JSON.stringify(chainEvidence, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "monat-2026-10-aggregate.json"), JSON.stringify(monatEvidence, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "monat-2026-11-partial.json"), JSON.stringify(monatNovEvidence, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "ort-revenue-compare.json"), JSON.stringify(ortRevenueCompare, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "dst-timestamps.json"), JSON.stringify(dst, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "grid-v1-sample.json"), JSON.stringify(gridV1Sample, null, 2));
    for (const pack of netzExports) {
      writeFileSync(join(ARTIFACT_DIR, pack.file), JSON.stringify(pack, null, 2));
    }

    expect(balanceSurplus.maxResidualMwh).toBeLessThan(1e-4);
    expect(balanceDry.maxResidualMwh).toBeLessThan(1e-4);
    expect(dst.spring.slotCount).toBe(92);
    expect(dst.fall.slotCount).toBe(100);
    expect(dst.fallTyptag2026.slotCount).toBe(100);
    expect(dst.normal.slotCount).toBe(96);
    expect(surplusSlots.every((s) => s.timestampIso.includes("+01:00"))).toBe(true);
    expect(monatEvidence.dailyOriginalAndGraphPoints).toHaveLength(31);
    expect(missingDays).toHaveLength(0);
    expect(Math.abs(sumSurplusGwh - graphSum)).toBeLessThan(1e-6);
    for (const pack of netzExports) {
      expect(pack.audit.id).toBe(pack.meta.badgeStoredInJson);
      expect(typeof pack.audit.reliefPpHours).toBe("number");
      expect(pack.pricesEurPerMwh).toHaveLength(96);
      expect(countSimultaneousChargeDischarge(pack.series.chargeMw, pack.series.dischargeMw)).toBe(0);
      expect(pack.meta.storageDispatchAudit.ok).toBe(true);
      expect(pack.series.maxL1RecomputeGapPp).toBeLessThan(0.05);
    }
    for (const arch of ortRevenueCompare) {
      expect(arch.markt.endSocMwh).toBeCloseTo(arch.netz.endSocMwh, 1);
      expect(arch.markt.storageDispatchAudit.ok).toBe(true);
      expect(arch.netz.storageDispatchAudit.ok).toBe(true);
    }
    expect(readme.ui.monatPrimaryGraph).toBe(true);
    expect(addBerlinCalendarDays("2025-03-29", 1)).toBe("2025-03-30");

    for (const [key, row] of Object.entries(nationalFactorAudit)) {
      const ok = (row as { ok: boolean }).ok;
      if (!ok) {
        throw new Error(`national factor gate ${key}: ${JSON.stringify(row)}`);
      }
      expect(ok).toBe(true);
    }
    const okt24 = JSON.parse(
      readFileSync(join(ARTIFACT_DIR, "national-day-2026-10-24.json"), "utf8"),
    ) as Awaited<ReturnType<typeof exportNationalDayEvidence>>;
    for (const factor of [1, 2, 5, 10] as const) {
      const run = okt24.factorRuns.find((r) => r.factor === factor);
      expect(run).toBeDefined();
      const cap = expectedNationalCaps(factor);
      expect(run!.usableEnergyCapMwh).toBeCloseTo(cap.usableMwh, 1);
      expect(run!.maxSocMwhObserved).toBeLessThanOrEqual(cap.usableMwh + 0.05);
    }

    mkdirSync(join(MIRROR_ROOT, BUNDLE_ID), { recursive: true });
    cpSync(ARTIFACT_DIR, join(MIRROR_ROOT, BUNDLE_ID), { recursive: true });
  }, 300_000);
});
