import { socialMeta } from "@/lib/siteOg";
import { MethodikDocs } from "@/components/methodik/MethodikDocs";
import { MethodikInsights } from "@/components/methodik/MethodikInsights";
import { MethodikMonatKonzept } from "@/components/methodik/MethodikMonatKonzept";
import { MethodikKnoten } from "@/components/methodik/MethodikKnoten";
import { MethodikNetzKapazitaet } from "@/components/methodik/MethodikNetzKapazitaet";
import { MethodikPreisFenster } from "@/components/methodik/MethodikPreisFenster";
import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";

const methodikDescription =
  "Annahmen, Formeln und Grenzen des SpeicherPilot-Modells, einschließlich Kompromiss (ε-70, Kipppunkt, Rechtsrahmen).";

/** Must stay a literal and match DAILY_SERIES_REVALIDATE_SECONDS (30 minutes). */
export const revalidate = 1800;

export const metadata = {
  title: "Methodik",
  description: methodikDescription,
  alternates: { canonical: "/methodik" },
  ...socialMeta({ title: "Methodik", description: methodikDescription, url: "/methodik" }),
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
  return (
    <>
      <MethodikDocs fleet={fleetStand} />
      <MethodikPreisFenster />
      <MethodikInsights />
      <MethodikMonatKonzept />
      <MethodikKnoten />
      <MethodikNetzKapazitaet />
    </>
  );
}
