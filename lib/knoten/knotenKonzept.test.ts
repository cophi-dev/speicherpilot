import {
  loadKnotenManifest,
  loadKnotenCurve,
  resolveKnotenView,
} from "@/lib/knoten/knotenData.server";

describe("Knoten-Konzeptzahlen (Forschungskonzept v1)", () => {
  it("reproduziert 13.11. Stadtknoten ×5: 13 Viertelstunden, 20,8 %", () => {
    const { row } = resolveKnotenView({
      tag: "2026-11-13",
      typ: "stadt",
      k: 5,
      belegung: "voll",
    });
    expect(row.qhMarkt).toBe(13);
    expect(row.qhKnoten).toBe(0);
    expect(row.verlustPct).toBeGreaterThanOrEqual(20.7);
    expect(row.verlustPct).toBeLessThanOrEqual(20.9);
  });

  it("reproduziert 24.10. Windknoten ×5: 18 Viertelstunden, 6,7 %", () => {
    const { row } = resolveKnotenView({
      tag: "2026-10-24",
      typ: "wind",
      k: 5,
      belegung: "voll",
    });
    expect(row.qhMarkt).toBe(18);
    expect(row.qhKnoten).toBe(0);
    expect(row.verlustPct).toBeGreaterThanOrEqual(6.6);
    expect(row.verlustPct).toBeLessThanOrEqual(6.8);
  });

  it("liefert 96 Viertelstunden-Kurven pro Tag", () => {
    const manifest = loadKnotenManifest();
    const curve = loadKnotenCurve("voll", "herbst", "stadt", 5, "2026-11-13");
    expect(curve.base).toHaveLength(96);
    expect(curve.fm).toHaveLength(96);
    expect(curve.fk).toHaveLength(96);
    expect(manifest.limitMw).toBe(80);
  });
});