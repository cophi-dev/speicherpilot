const berlinClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZoneName: "shortOffset",
});

export type BerlinClock = { hm: string; offset: string };

/** Berlin clock time and a `+HH` offset. The offset separates the repeated hour on a clock change. */
export function berlinClockParts(instant: string | number): BerlinClock {
  const date = typeof instant === "number" ? new Date(instant) : new Date(instant);
  const parts = berlinClock.formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = zone.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
  const sign = match?.[1] === "-" ? "-" : "+";
  const hours = match ? Number(match[2]) : 0;
  const offset = `${sign}${String(hours).padStart(2, "0")}`;
  return { hm: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`, offset };
}

/**
 * One label per instant. A repeated Berlin clock time, such as 02:00 on 25 October 2026,
 * keeps the offset so the two marks are not the same string.
 */
export function uniqueQuarterLabels(instants: Array<string | number>): string[] {
  const parts = instants.map((instant) => berlinClockParts(instant));
  const counts = new Map<string, number>();
  for (const part of parts) {
    counts.set(part.hm, (counts.get(part.hm) ?? 0) + 1);
  }
  return parts.map((part) => ((counts.get(part.hm) ?? 0) > 1 ? `${part.hm} ${part.offset}` : part.hm));
}

export function quarterLabelFromHour(hour: number): string {
  let whole = Math.floor(hour);
  let minute = Math.round((hour - whole) * 60);
  if (minute === 60) {
    whole += 1;
    minute = 0;
  }
  return `${String(whole % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
