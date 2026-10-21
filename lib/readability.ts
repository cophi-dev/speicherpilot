import type { ConnectionStatus, GridSupportStatus } from "@/lib/sitePlanner";

/**
 * Reading aid for result tiles. Not a tariff, a bank rule, or a quote.
 * Cited on /methodik as a model assumption.
 */
export const READABILITY_CONFIG = {
  assumption: true,
  paybackGreenMaxYears: 8,
  paybackYellowMaxYears: 12,
} as const;

export type TrafficLight = "green" | "yellow" | "red";

export function ratePayback(years: number | null): TrafficLight {
  if (years == null || !Number.isFinite(years) || years > READABILITY_CONFIG.paybackYellowMaxYears) {
    return "red";
  }
  if (years <= READABILITY_CONFIG.paybackGreenMaxYears) {
    return "green";
  }
  return "yellow";
}

export function rateConnection(status: ConnectionStatus): TrafficLight {
  if (status === "ok") {
    return "green";
  }
  if (status === "near") {
    return "yellow";
  }
  return "red";
}

export function rateGridSupport(status: GridSupportStatus): TrafficLight {
  if (status === "supportive") {
    return "green";
  }
  if (status === "new-peak") {
    return "red";
  }
  return "yellow";
}

/** Whether the chosen battery actually cuts the import peak down to the limit. */
export function rateStorage(input: { peakBeforeKw: number; peakAfterKw: number; limitKw: number }): TrafficLight {
  if (input.peakAfterKw <= input.limitKw + 1e-3 && input.peakBeforeKw > input.limitKw) {
    return "green";
  }
  if (input.peakAfterKw + 1e-3 < input.peakBeforeKw) {
    return "yellow";
  }
  return "red";
}
