#!/usr/bin/env node
/**
 * Committed tag fast-path: records + residual days + prices (no live Energy-Charts on /tag).
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "data/tag-pages");
/** Nur historische Abrufe — im Betrieb gilt tagRollSnapshotPolicy (≥3 Tage live). */
const START = "2026-09-01";
const END = process.env.TAG_ROLL_SNAPSHOT_END ?? "2026-11-06";

async function main() {
  const { parsePowerPayload, residualDaysFromSlots } = await import("../lib/powerMix.ts");
  const { parseDayAheadPrices } = await import("../lib/dayAheadPrices.ts");
  const { buildTagesKennzahlRecords } = await import("../lib/auffaelligkeitRecords.ts");
  const fleet = JSON.parse(readFileSync(join(process.cwd(), "data/fleet-snapshot.json"), "utf8"));

  const powerUrl = `https://api.energy-charts.info/v2/total_power?country=de&start=${START}&end=${END}`;
  const powerRes = await fetch(powerUrl);
  if (!powerRes.ok) {
    throw new Error(`power ${powerRes.status}`);
  }
  const parsed = parsePowerPayload(await powerRes.json());
  if (!parsed) {
    throw new Error("parsePowerPayload");
  }
  const days = residualDaysFromSlots(parsed);

  const priceUrl = `https://api.energy-charts.info/v2/price?bzn=DE-LU&start=${START}&end=${END}`;
  const priceRes = await fetch(priceUrl);
  if (!priceRes.ok) {
    throw new Error(`price ${priceRes.status}`);
  }
  const prices = parseDayAheadPrices(await priceRes.json());

  const powerMw = fleet.powerGw * 1000;
  const energyMwh = fleet.energyGwh * 1000;

  const records = buildTagesKennzahlRecords({
    days,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    prices,
    powerMw,
    energyMwh,
  });

  const payload = {
    version: 1,
    coverageStart: START,
    coverageEnd: END,
    builtAt: new Date().toISOString(),
    dataStand: "Energy-Charts-Snapshot",
    offshorePresent: parsed.offshorePresent,
    powerSlots: parsed.slots,
    records,
    days,
    prices,
    fleet: {
      powerGw: fleet.powerGw,
      energyGwh: fleet.energyGwh,
      powerMw,
      energyMwh,
      updatedLabel: fleet.standLabel,
      source: fleet.source,
    },
  };

  mkdirSync(OUT, { recursive: true });
  const body = JSON.stringify(payload);
  const path = join(OUT, "roll-snapshot.json");
  writeFileSync(path, body);
  writeFileSync(
    join(OUT, "manifest.json"),
    JSON.stringify(
      {
        file: "roll-snapshot.json",
        sha256: createHash("sha256").update(body).digest("hex"),
        bytes: body.length,
        coverageStart: START,
        coverageEnd: END,
        dayCount: days.length,
        recordCount: records.length,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${path} (${(body.length / 1e6).toFixed(2)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
