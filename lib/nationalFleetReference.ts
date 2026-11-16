import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

/** Anzeige Referenzflotte ×1 (Battery Charts, gerundet). */
export const NATIONAL_REFERENCE_FLEET_POWER_GW = NATIONAL_BASE_FLEET.powerMw / 1000;

/** Nutzbare Energie in der UI (gerundet; Modell 8,15 GWh). */
export const NATIONAL_REFERENCE_FLEET_ENERGY_GWH = 8.27;