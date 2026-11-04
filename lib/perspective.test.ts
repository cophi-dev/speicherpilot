import { parsePerspective, parseScenario, sitePath } from "@/lib/perspective";

describe("perspective urls", () => {
  it("does not treat a missing view as a choice", () => {
    expect(parsePerspective(null)).toBeNull();
    expect(parsePerspective("")).toBeNull();
    expect(parsePerspective("developer")).toBeNull();
    expect(parsePerspective("projekt")).toBe("projekt");
    expect(parsePerspective("netz")).toBe("netz");
  });

  it("maps legacy scenario ids", () => {
    expect(parseScenario("supermarkt")).toBe("ladepark");
    expect(parseScenario("quartier")).toBe("ladepark");
    expect(parseScenario("bollingstedt")).toBe("grossspeicher");
    expect(parseScenario("ladepark")).toBe("ladepark");
    expect(parseScenario("unbekannt")).toBeNull();
  });

  it("puts the choice only in the query string", () => {
    expect(sitePath("netz", "quartier")).toBe("/ort?sicht=netz&scenario=quartier");
    expect(sitePath("projekt")).toBe("/ort?sicht=projekt");
  });
});
