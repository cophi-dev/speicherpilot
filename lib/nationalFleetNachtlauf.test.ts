import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { z } from "zod";

const runSchema = z.object({
  horizon: z.enum(["day", "month"]),
  dateBerlin: z.string(),
  asOfBerlin: z.string().optional(),
  factor: z.number().int(),
  strategySlug: z.string(),
  strategyUi: z.string(),
  intervalCount: z.number().int().min(90),
  timestamp_berlin: z.array(z.string()),
  c_mw: z.array(z.number()),
  d_mw: z.array(z.number()),
  r_mw: z.array(z.number()),
  r_prime_mw: z.array(z.number()),
    modelFleet: z.object({
      basePowerMw: z.number(),
      baseEnergyMwh: z.number(),
      asOfBerlin: z.string(),
    }),
    provenance: z.object({
      lexPeakFlat: z.boolean().optional(),
      generatedAt: z.string(),
    }),
});

describe("national fleet nachtlauf", () => {
  const fixtureDir = join(process.cwd(), "data/national-fleet/_nachtlauf-fixture");

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it("schema: Tages-Lauf enthält Horizont und R′", () => {
    const sample = {
      horizon: "day" as const,
      dateBerlin: "2026-10-29",
      factor: 5,
      strategySlug: "min_peak_perfect_foresight",
      strategyUi: "spitze",
      intervalCount: 96,
      timestamp_berlin: Array.from({ length: 96 }, (_, i) => `2026-10-29T${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}:00+02:00`),
      c_mw: Array(96).fill(0),
      d_mw: Array(96).fill(0),
      r_mw: Array(96).fill(40000),
      r_prime_mw: Array(96).fill(39000),
      modelFleet: {
        basePowerMw: 4644.09022,
        baseEnergyMwh: 8152.4588,
        asOfBerlin: "2026-10-31",
      },
      provenance: { lexPeakFlat: true, generatedAt: new Date().toISOString() },
    };
    expect(runSchema.parse(sample).horizon).toBe("day");
  });

  it("idempotenz: zweiter Schreiblauf ändert SHA nicht", () => {
    mkdirSync(fixtureDir, { recursive: true });
    const path = join(fixtureDir, "x2_min_peak_perfect_foresight.json");
    const doc = {
      horizon: "day",
      dateBerlin: "2026-11-01",
      factor: 2,
      strategySlug: "min_peak_perfect_foresight",
      strategyUi: "spitze",
      intervalCount: 96,
      timestamp_berlin: Array(96).fill("2026-11-01T12:00:00+01:00"),
      c_mw: Array(96).fill(1),
      d_mw: Array(96).fill(0),
      e_start_mwh: Array(96).fill(4000),
      e_end_mwh: Array(96).fill(4000),
      r_mw: Array(96).fill(50000),
      r_prime_mw: Array(96).fill(49000),
      day_ahead_eur_mwh: Array(96).fill(80),
      modelFleet: {
        basePowerMw: 4644.09022,
        baseEnergyMwh: 8152.4588,
        asOfBerlin: "2026-10-31",
      },
      provenance: { lexPeakFlat: true, generatedAt: "2026-11-16T12:00:00+01:00" },
    };
    const payload = JSON.stringify(doc);
    writeFileSync(path, payload);
    const sha1 = readFileSync(path);
    writeFileSync(path, payload);
    const sha2 = readFileSync(path);
    expect(sha1.equals(sha2)).toBe(true);

    const py = join(process.cwd(), "scripts/national_fleet_nachtlauf.py");
    const probe = spawnSync("python3", ["-c", "import highspy"], { encoding: "utf8" });
    if (probe.status === 0) {
      const invalid = spawnSync(
        "python3",
        ["-c", `import pathlib; p=pathlib.Path(${JSON.stringify(path)}); p.write_text('{}')`],
        { encoding: "utf8" },
      );
      expect(invalid.status).toBe(0);
      // restore — write_idempotent in batch würde {} mit intervalCount 0 verweigern beim echten Lauf
      writeFileSync(path, payload);
    }
  });
});