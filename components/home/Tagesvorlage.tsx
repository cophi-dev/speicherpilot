import { NationalFleetTagSlot } from "@/components/home/NationalFleetTagSlot";
import { TagPageV4 } from "@/components/home/AuffaelligkeitKopf";
import type { CompleteTagPageModel } from "@/lib/tagPageProps.server";

/** Shared day template for `/` (yesterday focus) and `/tag/<datum>`. */
export function Tagesvorlage({ model }: { model: CompleteTagPageModel }) {
  const fleetSlot =
    !model.isStartSurface && model.fleetRun && model.fleetSlice ? (
      <NationalFleetTagSlot
        dayKey={model.dayKey}
        factor={model.fleetFactor}
        strategy={model.fleetStrategy}
        preloadedRun={model.fleetRun}
        preloadedSource={model.fleetRunSource ?? undefined}
        isStartSurface={model.isStartSurface}
      />
    ) : null;

  return (
    <TagPageV4
      dayKey={model.dayKey}
      todayKey={model.todayKey}
      lastCompleteDayKey={model.lastCompleteDayKey}
      dataStand={model.dataStand}
      result={model.result}
      records={model.records}
      day={model.day}
      lastSurplusKey={model.lastSurplusKey}
      dayOverview={model.dayOverview}
      fleetPowerGw={model.fleetPowerGw}
      fleetEnergyGwh={model.fleetEnergyGwh}
      fleetFactor={model.fleetFactor}
      fleetStrategy={model.fleetStrategy}
      fleetDayNoWindSolarSurplus={model.fleetDayNoWindSolarSurplus}
      preisTag={model.preisTag}
      marktInsights={model.marktInsights}
      simulatorTeaser={model.simulatorTeaser}
      fleetSoGerechnet={model.fleetSoGerechnet}
      startKarte={model.startKarte ?? null}
      leitfrage={model.leitfrage}
      isStartSurface={model.isStartSurface}
    >
      {fleetSlot}
    </TagPageV4>
  );
}