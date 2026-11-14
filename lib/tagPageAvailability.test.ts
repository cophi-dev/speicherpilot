/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("tag detail availability copy", () => {
  it("nutzt im Fenster nicht den ausserhalb-Status für fehlende Tage", () => {
    const page = readFileSync(join(process.cwd(), "app/tag/[datum]/page.tsx"), "utf8");
    expect(page).toMatch(/isTagDateInSelectWindow/);
    const missingDayBlock = page.match(
      /if \(!records \|\| !day \|\| day\.dateBerlin !== datum\) \{[\s\S]*?\n  \}/,
    )?.[0];
    expect(missingDayBlock).toBeDefined();
    const inWindowBranch = missingDayBlock!.match(/if \(inWindow\) \{([\s\S]*?)\n    \}/)?.[1];
    expect(inWindowBranch).toBeDefined();
    expect(inWindowBranch).toMatch(/redirect\(`\/tag\/\$\{lastComplete\}`\)/);
    expect(inWindowBranch).not.toMatch(/status="ausserhalb"/);
  });
});
