import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseMonatReglerCompact } from "@/lib/monatReglerAsset";
import { verifyKonzeptSpotChecks } from "@/lib/monatReglerKpis";
import type { NationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel";

describe("monatReglerKpis", () => {
  it("Stichprobe gegen Konzept-Spitzenwerte", () => {
    const metaPath = join(process.cwd(), "data/national-fleet/2026-10/fleet-month-meta.json");
    const bundle: NationalFleetMonthBundle = {
      monthKey: "2026-10",
      bundleId: "test",
      provenance: {},
      summary: JSON.parse(readFileSync(metaPath, "utf8")).summary,
      marginal: [],
      physics: {},
      runs: {} as NationalFleetMonthBundle["runs"],
    };
    const compact = parseMonatReglerCompact(
      JSON.parse(readFileSync(join(process.cwd(), "data/national-fleet/2026-10/fleet-month-compact.json"), "utf8")),
    );
    expect(compact.refPeakMw).toBeCloseTo(64405.9, 1);
    verifyKonzeptSpotChecks(bundle);
  });
});