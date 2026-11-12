import { formatQuantity } from "@/lib/formatQuantity";
import type { ResidualSlot } from "@/lib/windSolarResidual";

export function lueckeTooltipRows(slot: ResidualSlot) {
  const load = slot.loadMw / 1000;
  const ws = (slot.windMw + slot.solarMw) / 1000;
  const gap = Math.max(0, slot.loadMw - slot.windMw - slot.solarMw) / 1000;
  return [
    { label: "Verbrauch", value: `${formatQuantity(load, "de", 1)} GW` },
    { label: "Wind+Sonne", value: `${formatQuantity(ws, "de", 1)} GW` },
    { label: "Lücke", value: `${formatQuantity(gap, "de", 1)} GW` },
  ];
}
