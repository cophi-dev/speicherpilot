export type Perspective = "projekt" | "netz";

export type ScenarioId = "ladepark" | "land" | "stadt" | "grossspeicher";

export const SCENARIO_IDS: readonly ScenarioId[] = ["ladepark", "land", "stadt", "grossspeicher"];

const LEGACY_MAP: Record<string, ScenarioId> = {
  supermarkt: "ladepark",
  quartier: "ladepark",
  bollingstedt: "grossspeicher",
};

export function parsePerspective(value: string | null): Perspective | null {
  if (value === "projekt" || value === "netz") {
    return value;
  }
  return null;
}

export function parseScenario(value: string | null): ScenarioId | null {
  if (!value) {
    return null;
  }
  if (value in LEGACY_MAP) {
    return LEGACY_MAP[value];
  }
  if (value === "ladepark" || value === "land" || value === "stadt" || value === "grossspeicher") {
    return value;
  }
  return null;
}

export function defaultScenario(view: Perspective): ScenarioId {
  return view === "netz" ? "land" : "ladepark";
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

export function scenarioFromParams(params: URLSearchParams, view: Perspective): ScenarioId {
  return parseScenario(params.get("scenario")) ?? defaultScenario(view);
}
