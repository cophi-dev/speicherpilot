function berlinClockParts(unixMs: number): {
  dateKey: string;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(unixMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

/** Viertelstunden pro Berlin-Kalendertag (92/96/100 bei DST). */
export function expectedQuartersBerlinDay(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  let dayStart: number | null = null;
  const scan = Date.UTC(y, m - 1, d - 1, 12, 0, 0);
  for (let i = 0; i < 72; i += 1) {
    const t = scan + i * 3600_000;
    const p = berlinClockParts(t);
    if (p.dateKey === dateKey && p.hour === 0 && p.minute === 0 && p.second === 0) {
      dayStart = t;
      break;
    }
  }
  if (dayStart == null) {
    return 96;
  }
  for (let i = 20; i <= 28; i += 1) {
    const t = dayStart + i * 3600_000;
    const p = berlinClockParts(t);
    if (p.dateKey !== dateKey && p.hour === 0 && p.minute === 0 && p.second === 0) {
      return Math.round((t - dayStart) / (15 * 60 * 1000));
    }
  }
  return 96;
}