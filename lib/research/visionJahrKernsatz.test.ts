import { buildVisionJahrKernsatz } from "@/lib/research/visionJahrKernsatz";

describe("Vision Kernsatz", () => {
  it("stützt „Ein Fünftel“ aus JSON (Verhältnis ≤ 0,2)", () => {
    const k = buildVisionJahrKernsatz();
    expect(k.useEinFuenftel).toBe(true);
    expect(k.preisSpitzenRatio).toBeLessThanOrEqual(0.2);
    expect(k.paragraph).toContain("ein Fünftel");
    expect(k.paragraph).toContain("(n\u22121)");
  });

  it("enthält keine verbotenen Begriffe", () => {
    const k = buildVisionJahrKernsatz();
    const lower = k.paragraph.toLowerCase();
    expect(lower).not.toContain("netzdienlich");
    expect(lower).not.toContain("netzanschlussprüfung");
  });
});