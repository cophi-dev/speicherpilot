/**
 * @jest-environment node
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
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

const ARTIFACT_DIR = join(process.cwd(), "artifacts/launch-abnahme");
const ARCHETYPES: Array<"land" | "stadt"> = ["land", "stadt"];
const MODES: OrtMode[] = ["markt", "vertrag", "netz"];
const DT_H = 0.25;

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

  it("writes INPUT/OUTPUT evidence under artifacts/launch-abnahme", () => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    const sourceCommit = gitHead();

    const surplusSlots: GermanyDispatchSlot[] = [
      slot({
        timestampIso: "2026-10-25T11:00:00+02:00",
        hourBerlin: 11,
        loadMw: 10_000,
        windOnshoreMw: 25_000,
        windOffshoreMw: 5_000,
        solarMw: 5_000,
        windSolarMw: 35_000,
      }),
      slot({
        timestampIso: "2026-10-25T18:00:00+02:00",
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
    };

    const dst = {
      sourceCommit,
      spring: exportDstSeries("2025-03-30"),
      fall: exportDstSeries("2025-10-26"),
      normal: exportDstSeries("2026-07-15"),
    };

    const netzExports = ARCHETYPES.flatMap((archKey) =>
      MODES.map((mode) => {
        const data = archetypeByKey(archKey);
        const series = data.series.modes[mode];
        const audit = auditBadgeV2({ L0n1: data.series.L0n1, L1n1: series.L1n1 });
        return {
          file: `netz-${archKey}-${mode}-timeseries.json`,
          meta: {
            archetype: archKey,
            mode,
            syntheticExample: `SimBench-Typtag ${data.typtag}, Day-Ahead ${data.priceDay}; kein Messjahr`,
            voltageModeled: "vmin/vmax arrays per qh (pandapower); keine n-1-Physik im Badge v2",
            bezugFestMw: data.xMw,
            einspeisFlexMw: data.yMw,
            storagePMw: data.storage.pMw,
            storageEMwh: data.storage.eMwh,
            revenuePctVsMarkt: data.revenuePctTyptag[mode],
            revenueNote:
              "Prozent = Modellerlös am Mustertag relativ zum Markt-Modus am selben Tag (100 % Basis). Negativ = netto schlechter als reiner Markt.",
            badgeRule: audit.ruleSummary,
            badgeStoredInJson: data.badge[mode],
          },
          audit,
          series: {
            hour: data.series.hour,
            L0n0: data.series.L0n0,
            L0n1: data.series.L0n1,
            L1n1: series.L1n1,
            chargeMw: series.c,
            dischargeMw: series.d,
            socMwh: series.soc,
            vmin: series.vmin,
            vmax: series.vmax,
          },
        };
      }),
    );

    const gridV1Sample = assessConnectionGridBadge({
      netKw: [400, 500, 300],
      chargeKw: [0, 0, 200],
      dischargeKw: [0, 100, 0],
      limitKw: 450,
    });

    const readme = {
      sourceCommit,
      generatedAt: new Date().toISOString(),
      rules: {
        ortNetzBadge: "ort-badge-v2 (see badge audits in netz-*-timeseries.json)",
        siteConnectionBadge: "grid-support v1 (60 % discharge in ≥90 % peak intervals, no new charge peak)",
        notMixed: "Ort /ort uses v2 only; /site connection uses v1 — documented separately",
      },
      files: [
        "dispatch-evidence.json",
        "chain-fleet-evidence.json",
        "monat-2026-10-aggregate.json",
        "dst-timestamps.json",
        ...netzExports.map((n) => n.file),
        "grid-v1-sample.json",
      ],
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
    writeFileSync(join(ARTIFACT_DIR, "dst-timestamps.json"), JSON.stringify(dst, null, 2));
    writeFileSync(join(ARTIFACT_DIR, "grid-v1-sample.json"), JSON.stringify(gridV1Sample, null, 2));
    for (const pack of netzExports) {
      writeFileSync(join(ARTIFACT_DIR, pack.file), JSON.stringify(pack, null, 2));
    }

    expect(balanceSurplus.maxResidualMwh).toBeLessThan(1e-4);
    expect(balanceDry.maxResidualMwh).toBeLessThan(1e-4);
    expect(dst.spring.slotCount).toBe(92);
    expect(dst.fall.slotCount).toBe(100);
    expect(dst.normal.slotCount).toBe(96);
    expect(Math.abs(sumSurplusGwh - graphSum)).toBeLessThan(1e-6);
    for (const pack of netzExports) {
      expect(pack.audit.id).toBe(pack.meta.badgeStoredInJson);
    }
    expect(readme.ui.monatPrimaryGraph).toBe(true);
    expect(addBerlinCalendarDays("2025-03-29", 1)).toBe("2025-03-30");
  });
});
