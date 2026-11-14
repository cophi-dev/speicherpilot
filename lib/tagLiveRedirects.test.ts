import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Live-Tag Redirects (307)", () => {
  const root = join(__dirname, "..", "app");

  it("nutzt redirect statt permanentRedirect in /tag", () => {
    const src = readFileSync(join(root, "tag", "page.tsx"), "utf8");
    expect(src).toMatch(/\bredirect\(/);
    expect(src).not.toMatch(/permanentRedirect/);
  });

  it("nutzt redirect statt permanentRedirect in /live", () => {
    const src = readFileSync(join(root, "live", "page.tsx"), "utf8");
    expect(src).toMatch(/\bredirect\(/);
    expect(src).not.toMatch(/permanentRedirect/);
  });

  it("nutzt redirect in /tag/[datum] für unvollständige Tage", () => {
    const src = readFileSync(join(root, "tag", "[datum]", "page.tsx"), "utf8");
    expect(src).toMatch(/\bredirect\(/);
    expect(src).not.toMatch(/permanentRedirect/);
    expect(src).toMatch(/TagPageLaufend/);
    expect(src).toMatch(/loadLiveTagView/);
  });
});