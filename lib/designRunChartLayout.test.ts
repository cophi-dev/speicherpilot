/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("design-run chart layout", () => {
  it("reserviert Monats-Skeleton-Höhen (CLS)", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.v4-fleet-ts-skeleton[\s\S]*min-height:\s*709px/);
    expect(css).toMatch(/\.v4-fleet-ts-skeleton\.has-compare-legend[\s\S]*min-height:\s*739px/);
    expect(css).toMatch(/@media \(min-width: 768px\)[\s\S]*min-height:\s*508px/);
    expect(css).toMatch(/min-height:\s*538px/);
  });

  it("hält Achsen-/Tick-Labels ≥12px", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.v4-fleet-ts-x[\s\S]*font-size:\s*(?:12px|var\(--type-12\))/);
    expect(css).toMatch(/\.v4-fleet-ts-ytick[\s\S]*font-size:\s*(?:12px|var\(--type-12\))/);
  });
});
