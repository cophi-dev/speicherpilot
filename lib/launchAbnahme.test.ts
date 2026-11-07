/**
 * @jest-environment node
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ROUND_TRIP_EFFICIENCY } from "@/lib/roundTripEfficiency";
import { MORE_STORAGE_ROUND_TRIP, MORE_STORAGE_DISCHARGE_HOUR } from "@/lib/moreStorage";
import { CHAIN_SOC_MIN, CHAIN_SOC_MAX } from "@/lib/chainedFleetSoc";
import { archetypeByKey, badgeForArchetype } from "@/lib/ortArchetypes";
import type { OrtMode } from "@/lib/ortArchetypesSchema";
import {
  addBerlinCalendarDays,
  findFirstUnixSecondForBerlinDateKey,
  getBerlinDateKeyFromUnixSeconds,
} from "@/lib/berlinCalendar";

const ARCHETYPES: Array<"land" | "stadt"> = ["land", "stadt"];
const MODES: OrtMode[] = ["markt", "vertrag", "netz"];

const ARTIFACT_DIR = join(process.cwd(), "artifacts/launch-abnahme");

function berlinQuarterCountOnDay(dayKey: string): number {
  const start = findFirstUnixSecondForBerlinDateKey(dayKey);
  let count = 0;
  for (let s = start; s < start + 36 * 3600; s += 15 * 60) {
    if (getBerlinDateKeyFromUnixSeconds(s) !== dayKey) {
      break;
    }
    count += 1;
  }
  return count;
}

describe("Launch-Abnahme SpeicherPilot", () => {
  it("exports netz matrix and model constants for independent review", () => {
    mkdirSync(ARTIFACT_DIR, { recursive: true });

    const netzCases = ARCHETYPES.flatMap((archKey) => {
      const data = archetypeByKey(archKey);
      return MODES.map((mode) => {
        const badge = badgeForArchetype(data, mode);
        const series = data.series.modes[mode];
        return {
          archetype: archKey,
          mode,
          typtag: data.typtag,
          priceDay: data.priceDay,
          badgeComputed: badge.id,
          badgeStored: data.badge[mode],
          over100Before: badge.over100Before,
          over100After: badge.over100After,
          criticalHours: badge.criticalHours,
          bezugMaxMw: data.xMw,
          einspeisMaxMw: data.yMw,
          storagePMw: data.storage.pMw,
          storageEMwh: data.storage.eMwh,
          revenuePctTyptag: data.revenuePctTyptag[mode],
          socMinAssumed: 0.1,
          socMaxAssumed: 0.9,
          badgeReason: badge.hint,
        };
      });
    });

    const dst = {
      springForward: {
        dayBefore: "2025-03-29",
        dstDay: "2025-03-30",
        quarters: berlinQuarterCountOnDay("2025-03-30"),
      },
      fallBack: {
        dayBefore: "2025-10-25",
        dstDay: "2025-10-26",
        quarters: berlinQuarterCountOnDay("2025-10-26"),
      },
      normal: {
        day: "2026-07-15",
        quarters: berlinQuarterCountOnDay("2026-07-15"),
      },
    };

    const model = {
      roundTripEfficiency: ROUND_TRIP_EFFICIENCY,
      moreStorageRoundTrip: MORE_STORAGE_ROUND_TRIP,
      socWindow: { min: CHAIN_SOC_MIN, max: CHAIN_SOC_MAX },
      dischargeHourBerlin: MORE_STORAGE_DISCHARGE_HOUR,
      rteDeclaredBand: "80–90 % (methodik); implemented 85 %",
      quarterHourHours: 0.25,
      euroScope: "×1 Modellschätzung only",
      dataStandOrtArchetypes: "2026-11-05 build_ort_archetypes.py",
    };

    const routes = {
      monatRedirect: "/monat → /monat/YYYY-MM",
      tagDeepLink: "/tag/YYYY-MM-DD",
      ortNetz: "/ort?sicht=netz",
    };

    const payload = {
      generatedAt: new Date().toISOString(),
      dataStand: "repo snapshot main @ launch-checkliste run",
      tolerance: { soc: 1e-4, energyMwh: 1e-3, percent: 0.05 },
      model,
      dst,
      routes,
      netzCases,
      uiChecks: {
        jahresreiheTeaserRemoved: !readFileSync(join(process.cwd(), "components/site/OrtArchetypen.tsx"), "utf8").includes(
          "kommt als Nächstes",
        ),
      },
    };

    writeFileSync(join(ARTIFACT_DIR, "pruefmatrix.json"), JSON.stringify(payload, null, 2));
    writeFileSync(
      join(ARTIFACT_DIR, "netz-sechs-faelle.csv"),
      [
        "archetype,mode,badge,over100_n0,over100_mit,x_mw,y_mw,revenue_pct",
        ...netzCases.map(
          (c) =>
            `${c.archetype},${c.mode},${c.badgeComputed},${c.over100Before},${c.over100After},${c.bezugMaxMw ?? ""},${c.einspeisMaxMw ?? ""},${c.revenuePctTyptag}`,
        ),
      ].join("\n"),
    );
    writeFileSync(
      join(ARTIFACT_DIR, "dst-quartale.csv"),
      `case,day,quarters\nspring,${dst.springForward.dstDay},${dst.springForward.quarters}\nfall,${dst.fallBack.dstDay},${dst.fallBack.quarters}\nnormal,${dst.normal.day},${dst.normal.quarters}\n`,
    );

    expect(model.roundTripEfficiency).toBe(0.85);
    expect(netzCases).toHaveLength(6);
    for (const row of netzCases) {
      expect(row.badgeComputed).toBe(row.badgeStored);
    }
    expect(dst.springForward.quarters).toBe(92);
    expect(dst.fallBack.quarters).toBe(100);
    expect(dst.normal.quarters).toBe(96);
    expect(addBerlinCalendarDays("2025-03-29", 1)).toBe("2025-03-30");
    expect(payload.uiChecks.jahresreiheTeaserRemoved).toBe(true);
  });
});
