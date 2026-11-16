/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DAILY_SERIES_REVALIDATE_SECONDS } from "@/lib/dailySeriesCache";

describe("loadResearchDays ISR", () => {
  it("does not opt out of the Next.js cache (no unstable_noStore)", () => {
    const src = readFileSync(join(process.cwd(), "lib/research/loadResearchDays.server.ts"), "utf8");
    expect(src).not.toMatch(/unstable_noStore|noStore\(\)/);
    expect(src).toMatch(/dailySeriesFetchInit/);
  });

  it("legacy tail fetch uses the shared 30-minute revalidate", () => {
    const src = readFileSync(join(process.cwd(), "lib/research/legacyResearchPower.server.ts"), "utf8");
    expect(src).not.toMatch(/cache:\s*["']no-store["']/);
    expect(src).toMatch(/dailySeriesFetchInit/);
    expect(DAILY_SERIES_REVALIDATE_SECONDS).toBe(1800);
  });
});