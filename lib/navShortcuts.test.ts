/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("nav shortcuts", () => {
  it("vermeidet loadGermanyView in Tag-/Monat-Index", () => {
    const tag = readFileSync(join(process.cwd(), "app/tag/page.tsx"), "utf8");
    const monat = readFileSync(join(process.cwd(), "app/monat/page.tsx"), "utf8");
    expect(tag).toMatch(/resolveNavShortcuts/);
    expect(tag).not.toMatch(/loadGermanyView/);
    expect(monat).toMatch(/resolveNavShortcuts/);
    expect(monat).not.toMatch(/loadGermanyView/);
  });
});
