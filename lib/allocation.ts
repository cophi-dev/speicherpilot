export type AllocationRequest = {
  id: string;
  mw: number;
  reif: boolean;
};

export type AllocationResult = {
  festMw: number;
  flexMw: number;
  wartetMw: number;
};

export type AllocationOutcome = {
  requests: AllocationRequest[];
  results: AllocationResult[];
};

function roundMw(value: number): number {
  return Math.round(value * 10) / 10;
}

/** First-come allocation against fixed X and flexible (Y − X) caps. */
export function allocateWindhund(requests: AllocationRequest[], xMw: number, yMw: number): AllocationOutcome {
  const x = Math.max(0, xMw);
  const y = Math.max(x, yMw);
  const flexPool = y - x;
  let usedFest = 0;
  let usedFlex = 0;
  const results: AllocationResult[] = [];
  for (const req of requests) {
    const r = Math.max(0, req.mw);
    const fest = roundMw(Math.min(r, Math.max(0, x - usedFest)));
    usedFest += fest;
    const rest = Math.max(0, r - fest);
    const flex = roundMw(Math.min(rest, Math.max(0, flexPool - usedFlex)));
    usedFlex += flex;
    const wartet = roundMw(Math.max(0, r - fest - flex));
    results.push({ festMw: fest, flexMw: flex, wartetMw: wartet });
  }
  return { requests, results };
}

function waterFillProRata(weights: number[], cap: number): number[] {
  const n = weights.length;
  const alloc = new Array<number>(n).fill(0);
  let remaining = cap;
  const active = weights.map((w, i) => ({ w, i }));
  while (remaining > 1e-9 && active.length > 0) {
    const sum = active.reduce((s, a) => s + a.w, 0);
    if (sum <= 1e-12) {
      break;
    }
    const share = remaining / sum;
    const capped: typeof active = [];
    for (const item of active) {
      const give = Math.min(item.w, share * item.w);
      alloc[item.i] += give;
      remaining -= give;
      if (give + 1e-9 < item.w) {
        capped.push({ w: item.w - give, i: item.i });
      }
    }
    active.length = 0;
    active.push(...capped);
  }
  return alloc.map((v) => roundMw(v));
}

/** Stichtag allocation: only mature requests; pro-rata on fixed and flexible pools. */
export function allocateGeordnet(requests: AllocationRequest[], xMw: number, yMw: number): AllocationOutcome {
  const x = Math.max(0, xMw);
  const y = Math.max(x, yMw);
  const eligible = requests.filter((r) => r.reif);
  const weights = eligible.map((r) => Math.max(0, r.mw));
  const festParts = waterFillProRata(weights, x);
  const flexWeights = eligible.map((r, i) => Math.max(0, r.mw - festParts[i]));
  const flexParts = waterFillProRata(flexWeights, y - x);
  const byId = new Map<string, AllocationResult>();
  for (let i = 0; i < eligible.length; i += 1) {
    const req = eligible[i];
    const fest = festParts[i] ?? 0;
    const flex = flexParts[i] ?? 0;
    byId.set(req.id, {
      festMw: fest,
      flexMw: flex,
      wartetMw: roundMw(Math.max(0, req.mw - fest - flex)),
    });
  }
  const results = requests.map((req) => {
    if (!req.reif) {
      return { festMw: 0, flexMw: 0, wartetMw: roundMw(Math.max(0, req.mw)) };
    }
    return byId.get(req.id) ?? { festMw: 0, flexMw: 0, wartetMw: roundMw(req.mw) };
  });
  return { requests, results };
}

export function defaultStadtRequests(yMw: number): AllocationRequest[] {
  const y = Math.max(0.1, yMw);
  const raw = [0.8 * y, 0.5 * y, 0.3 * y];
  return raw.map((mw, index) => ({
    id: String.fromCharCode(65 + index),
    mw: roundMw(mw),
    reif: true,
  }));
}
