/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("monat routes", () => {
  it("redirects /monat to a month path", () => {
    const src = readFileSync(join(process.cwd(), "app/monat/page.tsx"), "utf8");
    expect(src).toMatch(/permanentRedirect\(`\/monat\/\$\{monthKey\}`\)/);
  });
});
