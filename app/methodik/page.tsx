import { MethodikDocs } from "@/components/methodik/MethodikDocs";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";

export const metadata = {
  title: "Methodik",
  description:
    "Annahmen, Formeln und Grenzen des SpeicherPilot-Modells. Nachvollziehbar für Live, Standort und Szenarien.",
};

export default async function MethodikPage() {
  const fleet = await loadLargeBatteryFleet();
  const fleetStand = fleet
    ? {
        powerGw: fleet.powerGw,
        energyGwh: fleet.energyGwh,
        standLabel: fleet.updatedLabel,
      }
    : null;
  return <MethodikDocs fleet={fleetStand} />;
}
