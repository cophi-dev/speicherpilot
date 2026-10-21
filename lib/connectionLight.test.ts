import { connectionLight } from "@/lib/connectionLight";

describe("connectionLight", () => {
  it("says the connection does not fit when the peak is over the limit", () => {
    const light = connectionLight(118, 90);
    expect(light.status).toBe("over");
    expect(light.sentence.de).toBe("Spitze 118 kW, Anschluss 90 kW: passt nicht.");
    expect(light.sentence.en).toBe("Peak 118 kW, connection 90 kW: does not fit.");
    expect(light.label.de).toBe("PASST NICHT");
  });

  it("is tight from 90 percent through the limit, including a peak that sits on the line", () => {
    expect(connectionLight(81, 90).status).toBe("tight");
    expect(connectionLight(90, 90).status).toBe("tight");
    expect(connectionLight(90, 90).sentence.de).toBe("Spitze 90 kW, Anschluss 90 kW: knapp.");
    expect(connectionLight(80.9, 90).status).toBe("ok");
  });

  it("fits when the peak stays under 90 percent", () => {
    const light = connectionLight(70, 90);
    expect(light.status).toBe("ok");
    expect(light.label.de).toBe("PASST");
    expect(light.sentence.en).toContain("fits");
  });

  it("stays gray when the connection capacity is missing", () => {
    for (const limit of [0, -5, Number.NaN]) {
      const light = connectionLight(118, limit);
      expect(light.status).toBe("missing");
      expect(light.ratio).toBeNull();
      expect(light.sentence.de).toBe("Anschlussleistung fehlt.");
    }
    expect(connectionLight(Number.NaN, 90).status).toBe("missing");
  });
});
