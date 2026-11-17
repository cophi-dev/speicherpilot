import { contrastRatio } from "@/lib/research/colorContrast";

describe("Vision G2 Annotation-Kontrast", () => {
  it("--research-dim ≥ 4,5:1 auf Hell und Dunkel", () => {
    expect(contrastRatio("#6b7178", "#f6f6f3")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#80868e", "#0b0d0f")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#80868e", "#121417")).toBeGreaterThanOrEqual(4.5);
  });
});