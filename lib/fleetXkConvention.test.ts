import { additionalFleetAtFactor, FLEET_XK_FOOTNOTE_DE, totalFleetAtFactor } from "@/lib/fleetXkConvention";
import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

describe("×k-Konvention (a)", () => {
  it("×1 entspricht der Ist-Flotte", () => {
    expect(totalFleetAtFactor(1)).toEqual(NATIONAL_BASE_FLEET);
    expect(additionalFleetAtFactor(1).powerMw).toBe(0);
  });

  it("×k skaliert Gesamtflotte linear", () => {
    expect(totalFleetAtFactor(2).powerMw).toBe(NATIONAL_BASE_FLEET.powerMw * 2);
    expect(totalFleetAtFactor(10).energyMwh).toBe(NATIONAL_BASE_FLEET.energyMwh * 10);
    expect(additionalFleetAtFactor(2).powerMw).toBe(NATIONAL_BASE_FLEET.powerMw);
    expect(additionalFleetAtFactor(10).powerMw).toBe(NATIONAL_BASE_FLEET.powerMw * 9);
  });

  it("Fußzeilentext ist gesetzt", () => {
    expect(FLEET_XK_FOOTNOTE_DE).toContain("×1");
  });
});
