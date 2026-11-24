import bundle from "@/data/bess-netzbetreiber/bundle.json";
import { bessNetzbetreiberBundleSchema } from "@/lib/bessNetzbetreiber/schema";
import { computeNetzbetreiberHeadlines } from "@/lib/bessNetzbetreiber/computeHeadlines";

describe("computeNetzbetreiberHeadlines", () => {
  const model = bessNetzbetreiberBundleSchema.parse(bundle);

  it("liefert Konzept-Kopfzahlen (~575 Einheiten, ~4,74 GW)", () => {
    const h = computeNetzbetreiberHeadlines(model);
    expect(h.units).toBeGreaterThanOrEqual(570);
    expect(h.bruttoGw).toBeGreaterThan(4.6);
    expect(h.bruttoGw).toBeLessThan(4.85);
  });

  it("E.ON-Konzern konsistent aus operatorClass", () => {
    const h = computeNetzbetreiberHeadlines(model);
    expect(h.eonBruttoGw).toBeGreaterThan(1.9);
    expect(h.eonBruttoGw).toBeLessThan(2.2);
    expect(h.eonSharePctTotal).toBeGreaterThan(40);
  });
});