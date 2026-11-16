import { buildVisionJahrKernsatz } from "@/lib/research/visionJahrKernsatz";

describe("Vision Kernsatz", () => {
  const k = buildVisionJahrKernsatz();

  it("stützt „Ein Fünftel“ aus JSON (Verhältnis ≤ 0,2)", () => {
    expect(k.useEinFuenftel).toBe(true);
    expect(k.preisSpitzenRatio).toBeLessThanOrEqual(0.2);
    expect(k.paragraph).toContain("höchstens ein Fünftel");
    expect(k.paragraph).toContain("Preisrückwirkung");
    expect(k.paragraph).toContain("(n\u22121)");
  });

  it("trägt den Owner-Wortlaut mit exakten Leistungen, Spitzentag und Quellen", () => {
    expect(k.paragraph).toContain("Von 16.11.2025 bis 15.11.2026");
    expect(k.paragraph).not.toContain("Im Jahr 16.11.");
    expect(k.paragraph).toContain("41,1");
    expect(k.paragraph).toContain("94,1");
    expect(k.paragraph).toContain("3.12.2025");
    expect(k.paragraph).toContain("17 Uhr");
    expect(k.paragraph).toContain("Stand 16.11.2026");
    expect(k.paragraph).toContain("Energy-Charts, SMARD, battery-charts");
    expect(k.paragraph).toContain("Laden als neue Last");
    expect(k.paragraph).not.toMatch(/\b41\u00a0GW|\b94\u00a0GW/);
  });

  it("nutzt die Meta-Description aus der Owner-Abnahme (um, nicht bis 13,4)", () => {
    expect(k.descriptionShort).toBe(
      "NEP-Speicher 2 h senken die Restlast-Spitze von 73,0 GW um 9,8 bis 13,4 GW, nach Preis höchstens ein Fünftel davon. Jahresrechnung, Stand 11/2026.",
    );
    expect(k.descriptionShort).toContain("um 9,8 bis 13,4 GW");
    expect(k.descriptionShort).not.toMatch(/senkt bis 13,4/);
    expect(k.descriptionShort.length).toBeLessThanOrEqual(160);
  });

  it("enthält keine verbotenen Begriffe", () => {
    const lower = `${k.paragraph} ${k.descriptionShort}`.toLowerCase();
    expect(lower).not.toContain("netzdienlich");
    expect(lower).not.toContain("netzanschlussprüfung");
  });
});
