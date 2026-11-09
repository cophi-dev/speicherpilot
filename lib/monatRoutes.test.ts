/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("monat routes", () => {
  it("redirects /monat to a month path", () => {
    const src = readFileSync(join(process.cwd(), "app/monat/page.tsx"), "utf8");
    expect(src).toMatch(/resolveNavShortcuts/);
    expect(src).toMatch(/permanentRedirect\(monatHref\)/);
  });

  it("uses surplus graph as primary month view", () => {
    const src = readFileSync(join(process.cwd(), "components/home/MonatPageV4.tsx"), "utf8");
    expect(src).toMatch(/MonatSurplusGraph/);
    expect(src).not.toMatch(/MonatCalendarGrid/);
  });
});
