import raw from "@/data/netz/netz-demo.json";

import { activeState, deriveLimits, energyBalanceMw, loadNetzDemo, tippingMw } from "@/lib/netzDemo";
import type { NetzFall, NetzNodeId, NetzRichtung, NetzState } from "@/lib/netzDemoSchema";

const data = loadNetzDemo(raw);

function scenario(fall: NetzFall, node: NetzNodeId, mode: NetzRichtung, pMw: 2 | 5 | 10 | 20) {
  const found = data.cases[fall].scenarios.find((item) => item.node === node && item.mode === mode && item.pMw === pMw);
  if (!found) {
    throw new Error(`${fall} ${node} ${mode} ${pMw} fehlt`);
  }
  return found;
}

function states(): NetzState[] {
  return [data.cases.hL.base, data.cases.lPV.base, ...data.cases.hL.scenarios, ...data.cases.lPV.scenarios];
}

describe("netz-demo schema", () => {
  it("parses the committed file and the scenario grid", () => {
    expect(Object.keys(raw.cases).sort()).toEqual(["hL", "lPV"]);
    expect(data.cases.hL.scenarios).toHaveLength(32);
    expect(data.cases.lPV.scenarios).toHaveLength(32);
    expect(data.mvBusIds).toHaveLength(114);
    expect(data.lines.length).toBeGreaterThan(0);
    expect(Object.keys(data.tipping).sort()).toEqual(["hL|entladen", "hL|laden", "lPV|entladen", "lPV|laden"]);
    for (const values of Object.values(data.tipping)) {
      expect(values).toHaveLength(114);
    }
    for (const state of states()) {
      if (state.status === "nicht_konvergiert") {
        expect(state.u).toBeNull();
        expect(state.loading).toBeNull();
        continue;
      }
      expect(state.u).toHaveLength(data.mvBusIds.length);
      expect(state.loading).toHaveLength(data.lines.length);
    }
  });

  it("keeps the energy balance, the status rule and the tipping points consistent", () => {
    for (const state of states()) {
      if (state.status === "nicht_konvergiert") {
        continue;
      }
      const balance = energyBalanceMw(state);
      expect(balance).not.toBeNull();
      expect(Math.abs(balance ?? 0)).toBeLessThanOrEqual(2e-3);
      const derived = deriveLimits(state);
      const within = (state.nBusesOutOfBand ?? 0) === 0 && (state.lineMax ?? 101) <= 100 && (state.trafoMax ?? 101) <= 100;
      expect(state.status === "ok").toBe(within);
      expect(derived.ok).toBe(within);
    }
    for (const fall of ["hL", "lPV"] as const) {
      for (const item of data.cases[fall].scenarios) {
        if (item.status === "nicht_konvergiert") {
          continue;
        }
        const bus = data.nodes.find((node) => node.id === item.node)?.bus;
        expect(bus).toEqual(expect.any(Number));
        const tip = tippingMw(data, fall, item.mode, bus ?? 0);
        expect(item.status === "ok").toBe(item.pMw <= tip + 1e-9);
      }
    }
  });

  it("matches the acceptance examples", () => {
    const hl = data.cases.hL.base;
    const lpv = data.cases.lPV.base;
    expect(hl.status).toBe("ok");
    expect(hl.vmin).toBeCloseTo(0.995, 3);
    expect(hl.vmax).toBeCloseTo(1.0417, 4);
    expect(hl.lineMax).toBeCloseTo(89.6, 1);
    expect(hl.trafoMax).toBeCloseTo(42.1, 1);
    expect(hl.n1 && "failed" in hl.n1 ? hl.n1.failed : null).toBe(28);
    expect(lpv.status).toBe("ok");
    expect(lpv.vmin).toBeCloseTo(1.0143, 4);
    expect(lpv.vmax).toBeCloseTo(1.0496, 4);
    expect(lpv.lineMax).toBeCloseTo(56.9, 1);
    expect(lpv.trafoMax).toBeCloseTo(23.4, 1);
    expect(lpv.n1 && "failed" in lpv.n1 ? lpv.n1.failed : null).toBe(20);

    const near = scenario("hL", "B", "laden", 5);
    expect(near.status).toBe("ok");
    expect(near.lineMax).toBeCloseTo(97.7, 1);
    expect(near.n1 && "failed" in near.n1 ? near.n1.failed : null).toBe(33);

    const both = scenario("hL", "C", "laden", 5);
    expect(both.status).toBe("Spannung");
    expect(Math.abs((both.vmin ?? 0) - 0.9643)).toBeLessThanOrEqual(2e-4);
    expect(Math.abs((both.lineMax ?? 0) - 152.7)).toBeLessThanOrEqual(0.1);
    expect(both.n1 && "checked" in both.n1 ? both.n1.checked : null).toBe(0);

    const better = scenario("hL", "C", "entladen", 5);
    expect(better.status).toBe("ok");
    expect(Math.abs((better.vmax ?? 0) - 1.0426)).toBeLessThanOrEqual(2e-4);
    expect(better.n1 && "failed" in better.n1 ? better.n1.failed : null).toBe(8);

    const high = scenario("hL", "D", "entladen", 5);
    expect(high.status).toBe("Spannung");
    expect(Math.abs((high.vmax ?? 0) - 1.0643)).toBeLessThanOrEqual(2e-4);
    expect(high.n1 && "checked" in high.n1 ? high.n1.checked : null).toBe(0);

    expect(scenario("hL", "A", "laden", 20).n1 && "failed" in scenario("hL", "A", "laden", 20).n1!).toBeTruthy();
    expect(scenario("hL", "A", "laden", 20).status).toBe("ok");
    expect(Math.abs((scenario("hL", "A", "laden", 20).vmin ?? 0) - 0.9909)).toBeLessThanOrEqual(2e-4);
    expect(scenario("hL", "A", "laden", 20).n1 && "failed" in scenario("hL", "A", "laden", 20).n1 ? scenario("hL", "A", "laden", 20).n1?.failed : null).toBe(30);
    expect(scenario("hL", "A", "entladen", 20).status).toBe("ok");
    expect(Math.abs((scenario("hL", "A", "entladen", 20).vmax ?? 0) - 1.0441)).toBeLessThanOrEqual(2e-4);
    expect(scenario("hL", "A", "entladen", 20).n1 && "failed" in scenario("hL", "A", "entladen", 20).n1! ? (scenario("hL", "A", "entladen", 20).n1 as { failed: number }).failed : null).toBe(28);
    expect((scenario("lPV", "A", "laden", 20).n1 as { failed?: number }).failed).toBe(20);
    expect((scenario("lPV", "A", "entladen", 20).n1 as { failed?: number }).failed).toBe(16);
    expect((scenario("lPV", "C", "laden", 2).n1 as { failed?: number }).failed).toBe(6);
    expect((scenario("lPV", "C", "laden", 5).n1 as { failed?: number }).failed).toBe(5);
    expect((scenario("lPV", "D", "laden", 5).n1 as { failed?: number }).failed).toBe(5);
    expect(scenario("hL", "D", "laden", 20).status).toBe("nicht_konvergiert");
    expect(scenario("lPV", "D", "laden", 20).status).toBe("nicht_konvergiert");
    expect(activeState(data, { fall: "hL", richtung: "laden", knoten: "B", pMw: 0 }).state).toBe(data.cases.hL.base);
  });
});
