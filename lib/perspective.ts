export type Perspective = "projekt" | "netz";

export type ScenarioId = "supermarkt" | "quartier" | "grossspeicher";

export const SCENARIO_IDS: readonly ScenarioId[] = ["supermarkt", "quartier", "grossspeicher"];

export function parsePerspective(value: string | null): Perspective | null {
  if (value === "projekt" || value === "netz") {
    return value;
  }
  return null;
}

export function parseScenario(value: string | null): ScenarioId | null {
  if (value === "supermarkt" || value === "quartier" || value === "grossspeicher") {
    return value;
  }
  return null;
}

export function sitePath(view: Perspective, scenario?: ScenarioId | null): string {
  const params = new URLSearchParams();
  params.set("sicht", view);
  if (scenario) {
    params.set("scenario", scenario);
  }
  return `/ort?${params.toString()}`;
}

export function perspectiveFromParams(params: URLSearchParams): Perspective {
  return parsePerspective(params.get("sicht")) ?? parsePerspective(params.get("view")) ?? "projekt";
}
