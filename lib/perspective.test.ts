import { parsePerspective, parseScenario, sitePath } from "@/lib/perspective";

describe("perspective urls", () => {
  it("does not treat a missing view as a choice", () => {
    expect(parsePerspective(null)).toBeNull();
    expect(parsePerspective("")).toBeNull();
    expect(parsePerspective("developer")).toBeNull();
    expect(parsePerspective("projekt")).toBe("projekt");
    expect(parsePerspective("netz")).toBe("netz");
  });

  it("keeps the three scenario ids", () => {
    expect(parseScenario("supermarkt")).toBe("supermarkt");
    expect(parseScenario("quartier")).toBe("quartier");
    expect(parseScenario("grossspeicher")).toBe("grossspeicher");
    expect(parseScenario("flower")).toBeNull();
  });

  it("puts the choice only in the query string", () => {
    expect(sitePath("netz", "quartier")).toBe("/site?view=netz&scenario=quartier");
    expect(sitePath("projekt")).toBe("/site?view=projekt");
  });
});
