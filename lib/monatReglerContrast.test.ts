import { readFileSync } from "node:fs";

import { contrastRatio } from "@/lib/research/colorContrast";

describe("Monat-Regler Kontrast", () => {
  it("beobachtet-Linie ≥ 4,5:1 auf Monatsfläche", () => {
    const css = readFileSync("components/monat-regler/monat-regler.module.css", "utf8");
    expect(css).toMatch(/--mr-observed:\s*#58606a/);
    expect(contrastRatio("#58606a", "#f6f6f3")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#43474c", "#f6f6f3")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#d2d6dc", "#121417")).toBeGreaterThanOrEqual(4.5);
  });
});