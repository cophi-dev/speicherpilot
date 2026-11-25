import bundle from "@/data/bess-netzbetreiber/bundle.json";
import manifest from "@/data/bess-netzbetreiber/manifest.json";

import { bessNetzbetreiberBundleSchema, type BessNetzbetreiberBundle } from "@/lib/bessNetzbetreiber/schema";

let cached: BessNetzbetreiberBundle | null = null;

export function loadBessNetzbetreiberBundle(): BessNetzbetreiberBundle {
  if (cached) {
    return cached;
  }
  const merged = { ...bundle, manifest };
  cached = bessNetzbetreiberBundleSchema.parse(merged);
  return cached;
}

export function bessNetzbetreiberManifest() {
  return manifest as Record<string, unknown>;
}