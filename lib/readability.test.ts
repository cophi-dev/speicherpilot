import { READABILITY_CONFIG, rateConnection, rateGridSupport, ratePayback, rateStorage } from "@/lib/readability";
import { connectionSentence, paybackSentence, storageSentence } from "@/lib/resultCopy";

describe("readability bands", () => {
  it("keeps the payback thresholds as a named model assumption", () => {
    expect(READABILITY_CONFIG.assumption).toBe(true);
    expect(READABILITY_CONFIG.paybackGreenMaxYears).toBeLessThan(READABILITY_CONFIG.paybackYellowMaxYears);
  });

  it("rates payback green, yellow, then red", () => {
    expect(ratePayback(8)).toBe("green");
    expect(ratePayback(8.01)).toBe("yellow");
    expect(ratePayback(12)).toBe("yellow");
    expect(ratePayback(12.01)).toBe("red");
    expect(ratePayback(null)).toBe("red");
  });

  it("rates connection and storage without using colour alone", () => {
    expect(rateConnection("ok")).toBe("green");
    expect(rateConnection("near")).toBe("yellow");
    expect(rateConnection("over")).toBe("red");
    expect(rateStorage({ peakBeforeKw: 120, peakAfterKw: 90, limitKw: 90 })).toBe("green");
    expect(rateStorage({ peakBeforeKw: 120, peakAfterKw: 100, limitKw: 90 })).toBe("yellow");
    expect(rateStorage({ peakBeforeKw: 120, peakAfterKw: 120, limitKw: 90 })).toBe("red");
    expect(rateGridSupport("supportive")).toBe("green");
    expect(rateGridSupport("mixed")).toBe("yellow");
    expect(rateGridSupport("new-peak")).toBe("red");
  });

  it("explains an over-limit peak in one sentence", () => {
    expect(connectionSentence("over", 34, "de")).toBe("Spitze liegt trotz Speicher noch 34 kW über der Anschlussgrenze.");
    expect(connectionSentence("near", 0, "de")).toContain("Anschlussgrenze");
    expect(paybackSentence(6.1, "de")).toContain("schnell");
    expect(paybackSentence(null, "de")).toContain("Lebensdauer");
    expect(storageSentence(40.2, 40.4, "de")).toBe("40 kWh Speicherinhalt · 40 kW Leistung.");
  });
});
