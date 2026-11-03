import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  auffaelligkeitForDay,
  kopfMetric,
  scoreDay,
  type MetricKey,
  type TagesKennzahlRecord,
} from "@/lib/auffaelligkeit";

const FIXTURE = join(__dirname, "__fixtures__", "auffaelligkeit-records.json");
const ALLE_TAGE = join(__dirname, "__fixtures__", "alle_tage.txt");

/** R2: Preisspanne before Abendspitze — only 29.10. differs from alle_tage.txt evening_peak line. */
const METRIC_OVERRIDE: Record<string, MetricKey> = {
  "2026-10-29": "spread",
};

const HEADLINE_OVERRIDE: Record<string, string[]> = {
  "2026-10-29": ["Börsenpreis lag zwischen", "So groß wie an keinem Tag der letzten 30"],
  "2026-11-02": ["fast so hoch wie am 29.10."],
};

function loadRecords(): TagesKennzahlRecord[] {
  return JSON.parse(readFileSync(FIXTURE, "utf8")) as TagesKennzahlRecord[];
}

function parseAlleTageLine(line: string): { dateKey: string; kindToken: string; sentence: string } | null {
  const m = line.match(/^(\d{4}-\d{2}-\d{2})\s+(\S+)\s+\|\s*(.+)$/);
  if (!m) {
    return null;
  }
  return { dateKey: m[1], kindToken: m[2], sentence: m[3] };
}

describe("alle_tage.txt reference (33 days, full fixture history)", () => {
  const records = loadRecords();
  const lines = readFileSync(ALLE_TAGE, "utf8")
    .split("\n")
    .map((l) => parseAlleTageLine(l.trim()))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  it("has 33 reference days", () => {
    expect(lines.length).toBe(33);
  });

  it.each(lines.map((l) => [l.dateKey, l.kindToken, l.sentence] as const))(
    "%s matches Regel v1 headline",
    (dateKey, kindToken, sentence) => {
      expect(records.some((r) => r.dateKey === dateKey)).toBe(true);
      const r = auffaelligkeitForDay(records, dateKey);
      const overrideKey = METRIC_OVERRIDE[dateKey];
      if (overrideKey) {
        expect(r.kind).toBe("metric");
        if (r.kind === "metric") {
          expect(r.key).toBe(overrideKey);
        }
        for (const part of HEADLINE_OVERRIDE[dateKey] ?? []) {
          expect(r.headline).toContain(part);
        }
        return;
      }

      if (kindToken === "SERIE") {
        expect(r.kind).toBe("serie");
      } else if (kindToken === "KEINE") {
        expect(r.kind).toBe("keine");
      } else {
        expect(r.kind).toBe("metric");
        if (r.kind === "metric") {
          expect(r.key).toBe(kindToken as MetricKey);
        }
      }

      for (const part of HEADLINE_OVERRIDE[dateKey] ?? []) {
        const text = `${r.headline} ${r.subline}`.toLowerCase();
        expect(text).toContain(part.toLowerCase());
      }

      const normalizedSentence = sentence.replace(/\s+/g, " ").trim();
      const normalizedOut = `${r.headline}${r.subline ? ` ${r.subline}` : ""}`.replace(/\s+/g, " ").trim();
      expect(normalizedOut).toBe(normalizedSentence);
      expect(`${r.kopfH1} ${r.kopfSubline}`).not.toMatch(/\.\./);
    }
  );

  it("evening peak times stay Europe/Berlin in fixture records", () => {
    const d = records.find((r) => r.dateKey === "2026-11-02");
    expect(d?.eveningPeakAt).toBe("17:15");
  });

  it("scoreDay has 30-day window for 2026-10-01", () => {
    expect(scoreDay(records, "2026-10-01")).not.toBeNull();
    expect(kopfMetric(records, "2026-10-01")?.key).toBe("ws_share");
  });
});
