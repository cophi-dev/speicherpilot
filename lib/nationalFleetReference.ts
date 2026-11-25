import { CHAIN_SOC_MAX, CHAIN_SOC_MIN } from "@/lib/chainedFleetSoc";
import { NATIONAL_BASE_FLEET } from "@/lib/exportLaunchNationalDays";

/** Anzeige Referenzflotte ×1 (Battery Charts, gerundet). */
export const NATIONAL_REFERENCE_FLEET_POWER_GW = NATIONAL_BASE_FLEET.powerMw / 1000;

/** Nennenergie-Flottenbasis (Battery Charts 31.10.2026), wie Nachtlauf/Monat. */
export const NATIONAL_REFERENCE_FLEET_ENERGY_GWH = NATIONAL_BASE_FLEET.energyMwh / 1000;

/** Nutzbarer SoC-Anteil der Nennenergie (10–90 %). */
export const NATIONAL_REFERENCE_FLEET_USABLE_SOC_FRACTION = CHAIN_SOC_MAX - CHAIN_SOC_MIN;

/** Nutzbare Energie der Referenzflotte: 8,15 GWh Nennenergie × 80 % = 6,52 GWh. */
export const NATIONAL_REFERENCE_FLEET_USABLE_ENERGY_GWH =
  NATIONAL_REFERENCE_FLEET_ENERGY_GWH * NATIONAL_REFERENCE_FLEET_USABLE_SOC_FRACTION;
