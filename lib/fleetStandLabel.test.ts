import { fleetStandLabelDe } from "@/lib/fleetStandLabel";

describe("fleetStandLabelDe", () => {
  it("marks committed snapshot as Fallback", () => {
    expect(fleetStandLabelDe("committed-snapshot", "battery-charts", "21. Oktober 2026")).toContain(
      "gespeicherter Stand (Fallback)"
    );
  });
});
