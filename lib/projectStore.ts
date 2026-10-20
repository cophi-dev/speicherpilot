import { create } from "zustand";
import { z } from "zod";

import {
  aggregateProjectConfigurations,
  defaultEconomicsAssumptions,
  parseEconomicsAssumptions,
  projectBessConfigSchema,
  type EconomicsAssumptions,
  type ProjectBessConfig,
} from "@/lib/bessEconomics";

export const sitePlacementSchema = z.object({
  id: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  capacityMwh: z.number().positive(),
  linkedLabel: z.string().optional(),
});

export type SitePlacement = z.infer<typeof sitePlacementSchema>;

export type ProjectStoreState = {
  liveConfiguration: ProjectBessConfig | undefined;
  selectedConfigurations: ProjectBessConfig[];
  economicsAssumptions: EconomicsAssumptions;
  sitePlacements: SitePlacement[];
  setLiveConfiguration: (config: ProjectBessConfig | undefined) => void;
  addConfiguration: (config: ProjectBessConfig) => void;
  setEconomicsAssumptions: (patch: Partial<EconomicsAssumptions>) => void;
  setSitePlacements: (placements: SitePlacement[]) => void;
  addSitePlacement: (placement: Omit<SitePlacement, "id"> & { id?: string }) => void;
  clearSitePlacements: () => void;
};

export function getFinancePhysicalConfig(state: {
  selectedConfigurations: ProjectBessConfig[];
  liveConfiguration: ProjectBessConfig | undefined;
}): ProjectBessConfig | null {
  if (state.selectedConfigurations.length > 0) {
    return aggregateProjectConfigurations(state.selectedConfigurations);
  }
  return state.liveConfiguration ?? null;
}

export const useProjectStore = create<ProjectStoreState>((set) => ({
  liveConfiguration: undefined,
  selectedConfigurations: [],
  economicsAssumptions: defaultEconomicsAssumptions,
  sitePlacements: [],
  setLiveConfiguration: (config) =>
    set({
      liveConfiguration: config ? projectBessConfigSchema.parse(config) : undefined,
    }),
  addConfiguration: (config) =>
    set((state) => ({
      selectedConfigurations: [
        ...state.selectedConfigurations,
        projectBessConfigSchema.parse(config),
      ],
    })),
  setEconomicsAssumptions: (patch) =>
    set((state) => ({
      economicsAssumptions: parseEconomicsAssumptions({
        ...state.economicsAssumptions,
        ...patch,
      }),
    })),
  setSitePlacements: (placements) =>
    set({
      sitePlacements: placements.map((placement) => sitePlacementSchema.parse(placement)),
    }),
  addSitePlacement: (placement) =>
    set((state) => ({
      sitePlacements: [
        ...state.sitePlacements,
        sitePlacementSchema.parse({
          ...placement,
          id: placement.id ?? globalThis.crypto.randomUUID(),
        }),
      ],
    })),
  clearSitePlacements: () => set({ sitePlacements: [] }),
}));
