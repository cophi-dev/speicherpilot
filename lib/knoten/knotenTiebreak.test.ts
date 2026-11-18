import { loadKnotenCurve, resolveKnotenView } from "@/lib/knoten/knotenData.server";

const JUMP_MW = 10;

function countCurveJumps(series: number[], thresh = JUMP_MW): number {
  let n = 0;
  for (let t = 1; t < series.length; t += 1) {
    const prev = series[t - 1]!;
    const cur = series[t]!;
    if (Math.abs(cur - prev) > thresh) {
      n += 1;
      continue;
    }
    if (prev * cur < 0 && Math.max(Math.abs(prev), Math.abs(cur)) > thresh) {
      n += 1;
    }
  }
  return n;
}

/** Vor Tiebreak (Durchsatz only): Wind 24.10. ×2 hatte fm=19, fk=15 Sprünge >10 MW. */
const LEGACY_JUMP_BASELINE = { fm: 19, fk: 15 };

describe("Knoten-LP Rampen-Tiebreak", () => {
  it("hält Konzept-Erlös und Grenzverletzungen stabil (<0,1 % vs. frühere statische Daten)", () => {
    const wind = resolveKnotenView({
      tag: "2026-10-24",
      typ: "wind",
      k: 5,
      belegung: "voll",
    });
    expect(wind.row.qhMarkt).toBe(18);
    expect(wind.row.qhKnoten).toBe(0);
    expect(wind.row.verlustPct).toBeGreaterThanOrEqual(6.6);
    expect(wind.row.verlustPct).toBeLessThanOrEqual(6.85);

    const stadt = resolveKnotenView({
      tag: "2026-11-13",
      typ: "stadt",
      k: 5,
      belegung: "voll",
    });
    expect(stadt.row.qhMarkt).toBe(13);
    expect(stadt.row.verlustPct).toBeGreaterThanOrEqual(20.7);
    expect(stadt.row.verlustPct).toBeLessThanOrEqual(20.95);
  });

  it("reduziert Sprünge >10 MW auf 24.10. Wind ×2 (Markt und knotentreu)", () => {
    const curve = loadKnotenCurve("voll", "herbst", "wind", 2, "2026-10-24");
    const fmJumps = countCurveJumps(curve.fm);
    const fkJumps = countCurveJumps(curve.fk);
    expect(fmJumps).toBeLessThan(LEGACY_JUMP_BASELINE.fm);
    expect(fkJumps).toBeLessThan(LEGACY_JUMP_BASELINE.fk);
  });
});