import { readFileSync } from "node:fs";

describe("Methodik-Quellenlinks", () => {
  it("Tap-Ziel min-height 44px", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.methodik-sources td a[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.methodik-v4 #quellen ul li[^}]*min-height:\s*44px/s);
    expect(css).toMatch(/\.methodik-v4 #d-recht > p a[^}]*min-height:\s*44px/s);
  });
});