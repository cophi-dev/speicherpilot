import { loadNationalFleetMonthBundle } from "@/lib/nationalMonthFleetModel.server";
import { strategyMarginalForUi } from "@/lib/nationalFleetMarginal";

describe("strategyMarginalForUi", () => {
  const bundle = loadNationalFleetMonthBundle();

  it("nutzt bundle.marginal nur für Überschuss", () => {
    const ui = strategyMarginalForUi(bundle, "ueberschuss");
    expect(ui.surplusPoolOnly).toBe(true);
    expect(ui.steps.length).toBe(bundle.marginal.length);
    expect(ui.steps[0]?.delta_capture_gwh).toBe(bundle.marginal[0]?.delta_capture_gwh);
  });

  it("leitet Markt-Grenznutzen aus summary ab, nicht aus bundle.marginal", () => {
    const surplus = strategyMarginalForUi(bundle, "ueberschuss");
    const markt = strategyMarginalForUi(bundle, "markt");
    expect(markt.surplusPoolOnly).toBe(false);
    expect(markt.steps.length).toBe(3);
    const sameAsSurplus = markt.steps.every(
      (m, i) => m.delta_capture_gwh === surplus.steps[i]?.delta_capture_gwh,
    );
    expect(sameAsSurplus).toBe(false);
  });
});
