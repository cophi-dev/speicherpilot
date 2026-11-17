import { readFileSync } from "node:fs";

describe("Methodik-Quellenlinks", () => {
  it("Tap-Ziel min-height 44px", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.methodik-sources td a\s*\{[^}]*min-height:\s*44px/s);
  });
});