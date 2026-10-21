import type { PackType } from "@/lib/bessEconomics";

/**
 * Illustrative nameplate presets for the sizing demo.
 * These are not a vendor catalog and are not tied to a specific product line.
 */
export type BessExamplePreset = {
  id: PackType;
  label: string;
  powerMw: number;
  energyMwh: number;
  footprintM2: number;
  weightTons: number;
  efficiency: number;
};

export const bessExamplePresets: Record<PackType, BessExamplePreset> = {
  "preset-standard": {
    id: "preset-standard",
    label: "Standard preset",
    powerMw: 1.927,
    energyMwh: 3.854,
    footprintM2: 57.4,
    weightTons: 38.2,
    efficiency: 92.5,
  },
  "preset-compact": {
    id: "preset-compact",
    label: "Compact preset",
    powerMw: 1.9,
    energyMwh: 3.2,
    footprintM2: 52.1,
    weightTons: 35.8,
    efficiency: 92.0,
  },
  custom: {
    id: "custom",
    label: "Custom",
    powerMw: 2.2,
    energyMwh: 4.1,
    footprintM2: 59.6,
    weightTons: 39.4,
    efficiency: 92.5,
  },
};

export function getExamplePackEquivalent(params: {
  powerMw: number;
  capacityMwh: number;
  referencePackType?: PackType;
}) {
  const { powerMw, capacityMwh, referencePackType = "preset-standard" } = params;
  const referencePack = bessExamplePresets[referencePackType];
  const packsByPower = referencePack.powerMw > 0 ? powerMw / referencePack.powerMw : 0;
  const packsByEnergy = referencePack.energyMwh > 0 ? capacityMwh / referencePack.energyMwh : 0;
  const requiredPacks = Math.max(packsByPower, packsByEnergy);

  return {
    referencePack,
    packsByPower,
    packsByEnergy,
    requiredPacks,
    roundedRequiredPacks: Math.ceil(requiredPacks),
  };
}
