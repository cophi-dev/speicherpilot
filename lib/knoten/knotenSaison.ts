import type { KnotenManifest } from "@/lib/knoten/knotenTypes";

export function knotenSaisonForDay(dayKey: string): "herbst" | "sommer" | null {
  if (dayKey >= "2026-10-01" && dayKey <= "2026-11-17") {
    return "herbst";
  }
  if (dayKey >= "2026-06-01" && dayKey <= "2026-07-31") {
    return "sommer";
  }
  return null;
}

export function knotenDayInWindow(dayKey: string, _manifest?: KnotenManifest): boolean {
  return knotenSaisonForDay(dayKey) !== null;
}

export function knotenDateBounds(manifest: KnotenManifest): { min: string; max: string } {
  return { min: manifest.dateRanges.sommer[0], max: manifest.dateRanges.herbst[1] };
}

/** Nearest day in the knoten windows to a requested calendar day. */
export function knotenNearestDay(dayKey: string, manifest: KnotenManifest): string {
  if (knotenDayInWindow(dayKey, manifest)) {
    return dayKey;
  }
  const bounds = knotenDateBounds(manifest);
  if (dayKey < bounds.min) {
    return bounds.min;
  }
  if (dayKey > bounds.max) {
    return bounds.max;
  }
  if (dayKey < manifest.dateRanges.herbst[0]) {
    return manifest.dateRanges.sommer[1];
  }
  return manifest.dateRanges.herbst[0];
}