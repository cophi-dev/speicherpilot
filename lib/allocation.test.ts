import { allocateGeordnet, allocateWindhund, defaultStadtRequests } from "@/lib/allocation";

describe("allocation", () => {
  const requests = defaultStadtRequests(10);

  it("respects caps", () => {
    const x = 3;
    const y = 8;
    for (const fn of [allocateWindhund, allocateGeordnet]) {
      const out = fn(requests, x, y);
      const fest = out.results.reduce((s, r) => s + r.festMw, 0);
      const flex = out.results.reduce((s, r) => s + r.flexMw, 0);
      expect(fest).toBeLessThanOrEqual(x + 1e-6);
      expect(flex).toBeLessThanOrEqual(y - x + 1e-6);
      out.results.forEach((r, i) => {
        expect(r.festMw + r.flexMw + r.wartetMw).toBeLessThanOrEqual(requests[i].mw + 1e-6);
      });
    }
  });

  it("fills firm when sum fits in X", () => {
    const small = [{ id: "a", mw: 1, reif: true }];
    const out = allocateWindhund(small, 5, 5);
    expect(out.results[0].festMw).toBe(1);
  });

  it("ignores immature in geordnet", () => {
    const out = allocateGeordnet([{ id: "a", mw: 2, reif: false }], 5, 8);
    expect(out.results[0].festMw).toBe(0);
    expect(out.results[0].wartetMw).toBe(2);
  });
});
