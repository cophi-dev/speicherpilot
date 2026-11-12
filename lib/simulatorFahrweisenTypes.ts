export type SimulatorFrontPoint = {
  index: number;
  source: string;
  name: string;
  revenueMioEur: number;
  reductionGw: number;
  peakGw: number;
  peakTs: string;
  isMarketLex: boolean;
  isNetzLex: boolean;
  isEps70: boolean;
  isEps50: boolean;
  isEps90: boolean;
};

export type SimulatorTagesklasse = {
  date: string;
  klasse: string;
  shareOfNetzReduction: number;
  marketReductionGw: number;
  netzReductionGw: number;
  marketRaisesPeak: boolean;
  marketRevenueEur: number;
};

export type SimulatorDispatchRow = {
  ts: string;
  residualMw: number;
  residualPrimeMw: number;
  chargeMw: number;
  dischargeMw: number;
  priceEurMwh: number;
  socMwh: number;
};

type Endpoint = {
  revenueMioEur: number;
  reductionGw: number;
  peakGw: number;
  peakTs?: string;
};

export type SimulatorFahrweisenData = {
  version: number;
  monthKey: string;
  fleet: { powerMw: number; energyMwh: number; factor: number; convention: string };
  baselinePeakGw: number;
  euroLabel: string;
  endpoints: {
    marketLex: Endpoint;
    netzLex: Endpoint;
    eps70: Endpoint;
    fnavTimeWindow: Endpoint;
    cap62Gw: Endpoint;
    capBaselineGw: Endpoint;
    solverArtefactNote: string;
  };
  front: SimulatorFrontPoint[];
  defaultIndex: number;
  namedIndices: { markt: number; kompromiss: number; netzdienlich: number };
  tagesklassen: SimulatorTagesklasse[];
  tagesklassenSummary: {
    winWin: number;
    neutral: number;
    konfliktSchwach: number;
    konfliktHebung: number;
    maxShare: number;
    maxShareDate: string;
  };
  kipppunkt: {
    factorApprox: number;
    analyticalMw: number;
    referenceMw: number;
    factors: Array<{ factor: number; marketPeakGw: number; netzPeakGw: number }>;
  };
  exampleDays: Record<
    string,
    { modes: { price: SimulatorDispatchRow[]; peak: SimulatorDispatchRow[]; eps70: SimulatorDispatchRow[] } }
  >;
  meta: Record<string, unknown>;
  sha256?: string;
};

export function formatMioEur(v: number, digits = 2): string {
  return `${v.toFixed(digits).replace(".", ",")} Mio.\u00A0€`;
}

export function formatGw(v: number, digits = 2): string {
  return `${v.toFixed(digits).replace(".", ",")}\u00A0GW`;
}

export function formatPct(v: number, digits = 2): string {
  return `${v.toFixed(digits).replace(".", ",")}\u00A0%`;
}

export function pctOfMarket(revenueMio: number, marketMio: number): string {
  return formatPct((revenueMio / marketMio) * 100, 2);
}
