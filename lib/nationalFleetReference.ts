import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

/** Anzeige Referenzflotte ×1 (Battery Charts, gerundet). */
export const NATIONAL_REFERENCE_FLEET_POWER_GW = NATIONAL_BASE_FLEET.powerMw / 1000;

/** Nennenergie-Flottenbasis (Battery Charts 31.10.2026), wie Nachtlauf/Monat. */
export const NATIONAL_REFERENCE_FLEET_ENERGY_GWH = NATIONAL_BASE_FLEET.energyMwh / 1000;