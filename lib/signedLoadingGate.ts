export type SignedLoadingInputs = {
  ratingMw: number;
  signedBaseMw: number[];
  chargeMw: number[];
  dischargeMw: number[];
  loadingPct: number[];
  slopeChargeMw: number;
  slopeDischargeMw: number;
};

export function signedWithBatteryMw(
  s0: number,
  c: number,
  d: number,
  slopeCharge: number,
  slopeDischarge: number,
): number {
  return s0 + slopeCharge * c + slopeDischarge * d;
}

export function loadingPctFromSignedMw(signedMw: number, ratingMw: number): number {
  if (ratingMw <= 0) {
    return 0;
  }
  return Math.round((100 * Math.abs(signedMw)) / ratingMw * 100) / 100;
}

export function auditSignedLoading(input: SignedLoadingInputs): string[] {
  const errors: string[] = [];
  const n = Math.min(
    input.signedBaseMw.length,
    input.chargeMw.length,
    input.dischargeMw.length,
    input.loadingPct.length,
  );
  for (let i = 0; i < n; i += 1) {
    const signed = signedWithBatteryMw(
      input.signedBaseMw[i] ?? 0,
      input.chargeMw[i] ?? 0,
      input.dischargeMw[i] ?? 0,
      input.slopeChargeMw,
      input.slopeDischargeMw,
    );
    const expected = loadingPctFromSignedMw(signed, input.ratingMw);
    if (Math.abs(expected - (input.loadingPct[i] ?? 0)) > 0.05) {
      errors.push(`qh${i}: loading ${input.loadingPct[i]} != ${expected} from signed ${signed.toFixed(4)} MW`);
    }
    // max(0,…) clipping would show 0 % while |signed|>0
    if (Math.abs(signed) > 0.05 && (input.loadingPct[i] ?? 0) < 0.01) {
      errors.push(`qh${i}: zero loading with nonzero signed flow ${signed.toFixed(4)} MW`);
    }
  }
  return errors;
}
