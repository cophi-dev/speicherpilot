import { z } from "zod";

export const netzStatusSchema = z.enum(["ok", "Spannung", "Auslastung", "nicht_konvergiert"]);

const n1SkippedSchema = z.object({
  checked: z.literal(0),
  skipped: z.string(),
});

const n1CheckedSchema = z
  .object({
    checked: z.literal(123),
    failed: z.number().int(),
    allResupplied: z.boolean(),
    failedElements: z.array(z.string()),
    newlyFailed: z.array(z.string()).optional(),
    noLongerFailed: z.array(z.string()).optional(),
  })
  .passthrough();

export const n1Schema = z.union([n1SkippedSchema, n1CheckedSchema]);

export const stateSchema = z.object({
  status: netzStatusSchema,
  vmin: z.number().optional(),
  vmax: z.number().optional(),
  lineMax: z.number().optional(),
  trafoMax: z.number().optional(),
  nBusesOutOfBand: z.number().int().optional(),
  u: z.array(z.number()).nullable(),
  loading: z.array(z.number()).nullable(),
  pExtMw: z.number().optional(),
  pLoadMw: z.number().optional(),
  pGenMw: z.number().optional(),
  lossesMw: z.number().optional(),
  n1: n1Schema.optional(),
});

export const scenarioSchema = stateSchema.extend({
  node: z.enum(["A", "B", "C", "D"]),
  mode: z.enum(["laden", "entladen"]),
  pMw: z.union([z.literal(2), z.literal(5), z.literal(10), z.literal(20)]),
  duNodePu: z.number().optional(),
});

const caseSchema = z.object({
  base: stateSchema,
  scenarios: z.array(scenarioSchema),
});

export const netzDemoSchema = z.object({
  schemaVersion: z.literal(1),
  generatedBy: z.string(),
  simbenchCode: z.string(),
  license: z.object({
    name: z.string(),
    url: z.string().url(),
    notice: z.string(),
    attribution: z.string(),
  }),
  versions: z.object({
    pandapower: z.string(),
    simbench: z.string(),
    numpy: z.string(),
  }),
  nodes: z.array(
    z.object({
      id: z.enum(["A", "B", "C", "D"]),
      bus: z.number().int(),
      zOhm: z.number(),
      name: z.string(),
      lage: z.string(),
    })
  ),
  taps: z.record(
    z.string(),
    z.object({
      tapPos: z.number().int(),
      busbarPu: z.number(),
      setpointPu: z.number(),
    })
  ),
  mvBusIds: z.array(z.number().int()),
  tree: z.array(
    z.object({
      bus: z.number().int(),
      parent: z.number().int().nullable(),
      depth: z.number().int(),
      strang: z.number().int(),
    })
  ),
  busXy: z.array(z.tuple([z.number(), z.number()])).optional(),
  lines: z.array(
    z.object({
      id: z.number().int(),
      a: z.number().int(),
      b: z.number().int(),
      km: z.number(),
      kind: z.string(),
      maxKa: z.number(),
      openEnd: z.boolean(),
    })
  ),
  trafos: z.array(
    z.object({
      id: z.number().int(),
      snMva: z.number(),
    })
  ),
  cases: z.object({
    hL: caseSchema,
    lPV: caseSchema,
  }),
  tipping: z.record(z.string(), z.array(z.number())),
  runtimeS: z.number(),
});

export type NetzDemoFile = z.infer<typeof netzDemoSchema>;
export type NetzState = z.infer<typeof stateSchema>;
export type NetzScenario = z.infer<typeof scenarioSchema>;
export type NetzNodeId = "A" | "B" | "C" | "D";
export type NetzFall = "hL" | "lPV";
export type NetzRichtung = "laden" | "entladen";
export type NetzPower = 0 | 2 | 5 | 10 | 20;
