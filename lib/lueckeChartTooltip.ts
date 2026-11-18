import { formatDeGw } from "@/lib/displayUnitFormat";
import type { ResidualSlot } from "@/lib/windSolarResidual";

export function lueckeTooltipRows(slot: ResidualSlot) {
  const load = slot.loadMw / 1000;
  const ws = (slot.windMw + slot.solarMw) / 1000;
  const gap = Math.max(0, slot.loadMw - slot.windMw - slot.solarMw) / 1000;
  return [
    { label: "Verbrauch", value: formatDeGw(load, 1) },
    { label: "Wind+Sonne", value: formatDeGw(ws, 1) },
    { label: "Lücke", value: formatDeGw(gap, 1) },
  ];
}
