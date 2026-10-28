import { writeFileSync } from "node:fs";
import path from "node:path";

import { addBerlinCalendarDays, formatBerlinDateKeyFromUtcDate } from "@/lib/berlinCalendar";
import { isQuietDay, parsePowerPayload, periodFigures, SURPLUS_DAY_GWH } from "@/lib/powerMix";

const LOOKBACK_DAYS = 370;

async function main() {
  const today = formatBerlinDateKeyFromUtcDate(new Date());
  const start = addBerlinCalendarDays(today, -LOOKBACK_DAYS);
  const url = `https://api.energy-charts.info/v2/total_power?country=de&start=${start}&end=${today}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`total_power ${response.status}`);
  }
  const parsed = parsePowerPayload(await response.json());
  if (!parsed) {
    throw new Error("no slots");
  }
  const byDay = new Map<string, typeof parsed.slots>();
  for (const slot of parsed.slots) {
    const list = byDay.get(slot.dateBerlin) ?? [];
    list.push(slot);
    byDay.set(slot.dateBerlin, list);
  }
  const months = new Map<string, { days: number; surplusDays: number }>();
  for (const [day, slots] of byDay) {
    if (day < start || day > today) {
      continue;
    }
    const month = day.slice(0, 7);
    const row = months.get(month) ?? { days: 0, surplusDays: 0 };
    const surplus = periodFigures(slots, parsed.offshorePresent).surplusGwh;
    if (surplus === null) {
      continue;
    }
    row.days += 1;
    if (!isQuietDay(surplus) && surplus > SURPLUS_DAY_GWH) {
      row.surplusDays += 1;
    }
    months.set(month, row);
  }
  const listed = [...months.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .slice(-12)
    .map(([month, row]) => ({ month, days: row.days, surplusDays: row.surplusDays }));
  const file = {
    generatedOn: today,
    source: "Energy-Charts (Fraunhofer ISE), CC BY 4.0",
    thresholdGwh: SURPLUS_DAY_GWH,
    months: listed,
  };
  const target = path.join(process.cwd(), "data", "surplus-months.json");
  writeFileSync(target, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`wrote ${listed.length} months to ${target}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exitCode = 1;
});
