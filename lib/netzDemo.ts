import raw from "@/data/netz/netz-demo.json";

import {
  netzDemoSchema,
  type NetzDemoFile,
  type NetzFall,
  type NetzNodeId,
  type NetzPower,
  type NetzRichtung,
  type NetzState,
} from "@/lib/netzDemoSchema";

export type { NetzDemoFile, NetzFall, NetzNodeId, NetzPower, NetzRichtung, NetzState };

export const VOLTAGE_BAND = { min: 0.965, max: 1.055 } as const;
export const NOMINAL_KV = 20;
export const N1_CASES = 123;
export const TIP_CAP_MW = 100;

export type NetzSelection = {
  fall: NetzFall;
  richtung: NetzRichtung;
  knoten: NetzNodeId;
  pMw: NetzPower;
};

export const DEFAULT_SELECTION: NetzSelection = {
  fall: "hL",
  richtung: "laden",
  knoten: "B",
  pMw: 5,
};

const FALLS: readonly NetzFall[] = ["hL", "lPV"];
const DIRECTIONS: readonly NetzRichtung[] = ["laden", "entladen"];
const NODES: readonly NetzNodeId[] = ["A", "B", "C", "D"];
const POWERS: readonly NetzPower[] = [0, 2, 5, 10, 20];

export type NetzQueryInput = {
  fall?: string | null;
  richtung?: string | null;
  knoten?: string | null;
  p?: string | null;
};

export function loadNetzDemo(payload: unknown = raw): NetzDemoFile {
  return netzDemoSchema.parse(payload);
}

export function parseSelection(input: NetzQueryInput | URLSearchParams): NetzSelection {
  const read = (key: keyof NetzQueryInput) => (input instanceof URLSearchParams ? input.get(key) : (input[key] ?? null));
  const fall = read("fall");
  const richtung = read("richtung");
  const knoten = read("knoten");
  const power = read("p");
  const fallOk = fall === null || FALLS.includes(fall as NetzFall);
  const directionOk = richtung === null || DIRECTIONS.includes(richtung as NetzRichtung);
  const nodeOk = knoten === null || NODES.includes(knoten as NetzNodeId);
  const powerNumber = power === null ? null : Number(power);
  const powerOk = power === null || POWERS.includes(powerNumber as NetzPower);
  if (!fallOk || !directionOk || !nodeOk || !powerOk) {
    return DEFAULT_SELECTION;
  }
  return {
    fall: (fall as NetzFall | null) ?? DEFAULT_SELECTION.fall,
    richtung: (richtung as NetzRichtung | null) ?? DEFAULT_SELECTION.richtung,
    knoten: (knoten as NetzNodeId | null) ?? DEFAULT_SELECTION.knoten,
    pMw: power === null ? DEFAULT_SELECTION.pMw : (powerNumber as NetzPower),
  };
}

export function selectionQuery(selection: NetzSelection): string {
  const params = new URLSearchParams();
  params.set("fall", selection.fall);
  params.set("richtung", selection.richtung);
  params.set("knoten", selection.knoten);
  params.set("p", String(selection.pMw));
  return params.toString();
}

export function activeState(data: NetzDemoFile, selection: NetzSelection): { state: NetzState; base: NetzState } {
  const block = data.cases[selection.fall];
  if (selection.pMw === 0) {
    return { state: block.base, base: block.base };
  }
  const scenario = block.scenarios.find(
    (item) => item.node === selection.knoten && item.mode === selection.richtung && item.pMw === selection.pMw
  );
  return { state: scenario ?? block.base, base: block.base };
}

export type DerivedLimits = {
  converged: boolean;
  voltage: boolean;
  loading: boolean;
  ok: boolean;
};

export function deriveLimits(state: NetzState): DerivedLimits {
  if (
    state.status === "nicht_konvergiert" ||
    state.u == null ||
    state.loading == null ||
    state.vmin == null ||
    state.vmax == null ||
    state.lineMax == null ||
    state.trafoMax == null
  ) {
    return { converged: false, voltage: false, loading: false, ok: false };
  }
  const voltage = state.vmin < VOLTAGE_BAND.min || state.vmax > VOLTAGE_BAND.max || (state.nBusesOutOfBand ?? 0) > 0;
  const loading = state.lineMax > 100 || state.trafoMax > 100;
  return { converged: true, voltage, loading, ok: !voltage && !loading };
}

export function nodeById(data: NetzDemoFile, id: NetzNodeId) {
  const node = data.nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error(`Knoten ${id} fehlt`);
  }
  return node;
}

export function tippingMw(data: NetzDemoFile, fall: NetzFall, richtung: NetzRichtung, bus: number): number {
  const values = data.tipping[`${fall}|${richtung}`];
  const index = data.mvBusIds.indexOf(bus);
  if (!values || index < 0) {
    throw new Error(`Kipppunkt fehlt für ${fall}|${richtung}`);
  }
  return values[index] ?? 0;
}

export function energyBalanceMw(state: NetzState): number | null {
  if (state.pExtMw == null || state.pGenMw == null || state.pLoadMw == null || state.lossesMw == null) {
    return null;
  }
  return state.pExtMw + state.pGenMw - state.pLoadMw - state.lossesMw;
}

export function checkedOutages(state: NetzState): {
  failed: number;
  failedElements: string[];
  newlyFailed: string[];
  noLongerFailed: string[];
} | null {
  if (!state.n1 || state.n1.checked !== 123) {
    return null;
  }
  return {
    failed: state.n1.failed,
    failedElements: state.n1.failedElements,
    newlyFailed: state.n1.newlyFailed ?? [],
    noLongerFailed: state.n1.noLongerFailed ?? [],
  };
}

export function outagesSkipped(state: NetzState): boolean {
  return state.n1?.checked === 0;
}
