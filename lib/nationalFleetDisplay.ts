import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

/** Einheitliche Flottenbasis für Tag/Monat-Modell (nicht Live-Rundung Battery Charts). */
export const NATIONAL_FLEET_DISPLAY_POWER_GW = NATIONAL_BASE_FLEET.powerMw / 1000;
export const NATIONAL_FLEET_DISPLAY_ENERGY_GWH = NATIONAL_BASE_FLEET.energyMwh / 1000;