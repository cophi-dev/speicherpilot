import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertMonotonicSlotXs,
  localHourZeroIndices,
  lueckeDayKind,
  plotXForAxisHour,
  plotXFromPeakAt,
  plotXFromSlotIndex,
  slotElapsedFraction,
  slotIndexAtLocalHour,
} from "@/lib/lueckeChartGeometry";
import type { ResidualSlot } from "@/lib/windSolarResidual";

const ART = join(process.cwd(), "artifacts/launch-r4-20261107T0918Z");

type DstRow = {
  utcIso: string;
  berlinHm: string;
  unixSeconds: number;
};

function fromDstRows(rows: DstRow[]): ResidualSlot[] {
  return rows.map((r) => {
    const [h, m] = r.berlinHm.split(":").map((v) => Number(v));
    return {
      timestampIso: r.utcIso,
      hourBerlin: h,
      minuteBerlin: m,
      loadMw: 1,
      windMw: 0,
      solarMw: 0,
    };
  });
}

function loadDstSection(key: "fallTyptag2026" | "spring"): ResidualSlot[] {
  const data = JSON.parse(readFileSync(join(ART, "dst-timestamps.json"), "utf8")) as Record<
    string,
    { slots: DstRow[]; slotCount: number }
  >;
  const section = data[key];
  expect(section.slots.length).toBe(section.slotCount);
  return fromDstRows(section.slots);
}

function berlinMinuteFromIso(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function loadNationalFall20261025(): ResidualSlot[] {
  const raw = JSON.parse(
    readFileSync(join(ART, "national-day-2026-10-25.json"), "utf8"),
  ) as {
    slots: Array<{
      timestampIso: string;
      hourBerlin: number;
      loadMw: number;
      windSolarMw: number;
    }>;
  };
  return raw.slots.map((s) => {
    const wallMin = berlinMinuteFromIso(s.timestampIso);
    return {
      timestampIso: s.timestampIso,
      hourBerlin: Math.floor(wallMin / 60),
      minuteBerlin: wallMin % 60,
      loadMw: s.loadMw,
      windMw: s.windSolarMw,
      solarMw: 0,
    };
  });
}

describe("lueckeChartGeometry", () => {
  const padLeft = 36;
  const plotW = 300;

  describe("standard 96qh (15-Min-Intervallbeginn)", () => {
    const standard = Array.from({ length: 96 }, (_, i) => {
      const totalMin = i * 15;
      return {
        timestampIso: `2026-10-29T${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}:00.000Z`,
        hourBerlin: Math.floor(totalMin / 60),
        minuteBerlin: totalMin % 60,
        loadMw: 1,
        windMw: 0,
        solarMw: 0,
      } satisfies ResidualSlot;
    });

    it("23:45 liegt vor Tick 24 (Mitternacht)", () => {
      const fracLast = slotElapsedFraction(95, 96);
      expect(fracLast).toBeCloseTo((23 * 60 + 45) / (96 * 15), 8);
      expect(fracLast).toBeLessThan(1);
      const xLast = plotXFromSlotIndex(95, 96, padLeft, plotW);
      const x24 = plotXForAxisHour(24, standard, padLeft, plotW);
      expect(x24).toBeGreaterThan(xLast);
    });

    it("Marker 18:15 = Intervallbeginn, Gitter 18:00 davor", () => {
      const xPeak = plotXFromPeakAt(standard, "18:15", padLeft, plotW);
      const x18 = plotXForAxisHour(18, standard, padLeft, plotW);
      expect(slotElapsedFraction(73, 96)).toBeCloseTo((18 * 60 + 15) / (96 * 15), 8);
      expect(xPeak - x18).toBeCloseTo((15 / (96 * 15)) * plotW, 4);
    });

    it("Gitterstunden 6/12/18 auf hh:00", () => {
      for (const h of [6, 12, 18]) {
        expect(plotXForAxisHour(h, standard, padLeft, plotW)).toBe(
          plotXFromSlotIndex(h * 4, 96, padLeft, plotW),
        );
      }
    });
  });

  describe("Herbst 2026-10-25 (100 Slots, UTC dst-timestamps)", () => {
    const slots = loadDstSection("fallTyptag2026");

    it("100 qh, monotonic, erste 02:00 vor zweiter", () => {
      expect(lueckeDayKind(slots.length)).toBe("dst-fall-100");
      const { monotonic } = assertMonotonicSlotXs(slots, padLeft, plotW);
      expect(monotonic).toBe(true);
      const twos = localHourZeroIndices(slots, 2);
      expect(twos).toHaveLength(2);
      expect(twos[0]).toBeLessThan(twos[1]);
      const xs = twos.map((i) => plotXFromSlotIndex(i, slots.length, padLeft, plotW));
      expect(xs[1]).toBeGreaterThan(xs[0]);
      expect(slots[twos[0]].timestampIso < slots[twos[1]].timestampIso).toBe(true);
    });
  });

  describe("Herbst national-day JSON (UTC sortiert)", () => {
    const slots = loadNationalFall20261025();

    it("100 Slots, UTC-Zeitstempel strikt aufsteigend", () => {
      expect(slots.length).toBe(100);
      for (let i = 1; i < slots.length; i += 1) {
        expect(slots[i].timestampIso > slots[i - 1].timestampIso).toBe(true);
      }
      const { monotonic } = assertMonotonicSlotXs(slots, padLeft, plotW);
      expect(monotonic).toBe(true);
    });
  });

  describe("Frühling 2025-03-30 (92 Slots, UTC)", () => {
    const slots = loadDstSection("spring");

    it("92 qh, keine 02:00–02:45, monotonic", () => {
      expect(lueckeDayKind(slots.length)).toBe("dst-spring-92");
      expect(localHourZeroIndices(slots, 2)).toHaveLength(0);
      const { monotonic } = assertMonotonicSlotXs(slots, padLeft, plotW);
      expect(monotonic).toBe(true);
      expect(slotIndexAtLocalHour(slots, 3)).toBe(
        slots.findIndex((s) => s.hourBerlin === 3 && s.minuteBerlin === 0),
      );
    });
  });
});
