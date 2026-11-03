/**
 * Generates lib/__fixtures__/auffaelligkeit-records.json from Energy-Charts (network).
 * Run: pnpm exec tsx --tsconfig tsconfig.json scripts/build-auffaelligkeit-fixture.ts
 */
import { writeFileSync } from "node:fs";

import { auffaelligkeitForDay } from "@/lib/auffaelligkeit";
import { buildTagesKennzahlRecords } from "@/lib/auffaelligkeitRecords";
import { parseDayAheadPrices } from "@/lib/dayAheadPrices";

async function loadPrices(start: string, end: string) {
  const url = `https://api.energy-charts.info/v2/price?bzn=DE-LU&start=${start}&end=${end}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`price fetch ${res.status}`);
  }
  return parseDayAheadPrices(await res.json());
}
import { parsePowerPayload, residualDaysFromSlots } from "@/lib/powerMix";

const START = "2026-09-01";
const END = "2026-11-02";

async function main() {
  const url = `https://api.energy-charts.info/v2/total_power?country=de&start=${START}&end=${END}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`power fetch ${res.status}`);
  }
  const raw = await res.json();
  const parsed = parsePowerPayload(raw);
  if (!parsed) {
    throw new Error("parsePowerPayload failed");
  }
  const days = residualDaysFromSlots(parsed);
  const prices = await loadPrices(START, END);
  const records = buildTagesKennzahlRecords({
    days,
    slots: parsed.slots,
    offshorePresent: parsed.offshorePresent,
    prices,
    powerMw: 4600,
    energyMwh: 8060,
  });
  writeFileSync("lib/__fixtures__/auffaelligkeit-records.json", `${JSON.stringify(records, null, 1)}\n`);
  for (const d of ["2026-10-29", "2026-10-31", "2026-11-02", "2026-10-27"]) {
    const r = auffaelligkeitForDay(records, d);
    console.log(d, "->", r.headline);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
