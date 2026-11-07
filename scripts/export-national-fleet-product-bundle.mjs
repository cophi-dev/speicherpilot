#!/usr/bin/env node
/** Export product fleet bundle slice for independent recheck (Run9 in repo). */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const stamp = process.env.LAUNCH_RUN10_STAMP ?? new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const out = join(process.cwd(), "artifacts", `launch-run10-${stamp}`);
mkdirSync(out, { recursive: true });

const src = join(process.cwd(), "data/national-fleet/2026-10");
cpSync(join(src, "fleet-month-bundle.json"), join(out, "fleet-month-bundle.json"));
cpSync(join(src, "manifest.json"), join(out, "manifest-manifest.json"));
cpSync(join(src, "design-daten-r9.csv"), join(out, "design-daten-r9.csv"), { force: true });

writeFileSync(
  join(out, "README-export.json"),
  JSON.stringify(
    {
      purpose: "Product-embedded Run9 national fleet month 2026-10",
      urls: [
        "/monat/2026-10?faktor=1&fahrweise=ueberschuss",
        "/monat/2026-10?faktor=1&fahrweise=spitze",
        "/tag/2026-10-29?faktor=1&fahrweise=ueberschuss",
      ],
      run9AgentStore: "/cursor/stores/self/october-fleet-factor-run9-20261107",
    },
    null,
    2,
  ),
);

console.log(`Exported ${out}`);
