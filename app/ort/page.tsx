import { OrtServerShell } from "@/components/site/OrtServerShell";
import { OrtSiteDayClient } from "@/components/site/OrtSiteDayClient";
import { capRingPoints } from "@/lib/capRingPoints";
import { loadReferenceParkModelDay } from "@/lib/loadReferenceParkModelDay";
import { parseSelection } from "@/lib/netzDemo";
import { parsePerspective, parseScenario } from "@/lib/perspective";

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const sicht = first(query.sicht) ?? "projekt";
  if (sicht === "netz") {
    return {
      title: "Ort · Netz und Anschluss",
      description: "Netzperspektive: Anschlussgrenze, Szenarien und Testnetz am Beispielanschluss.",
    };
  }
  return {
    title: "Ort · Speicherprojekt",
    description: "Projektentwicklung: Lastprofil, Peak Shaving und Einschätzung am Beispielanschluss.",
  };
}

export default async function OrtPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const view = parsePerspective(first(query.sicht)) ?? parsePerspective(first(query.view)) ?? "projekt";
  const scenario = parseScenario(first(query.scenario)) ?? "supermarkt";
  const modelDay = await loadReferenceParkModelDay();
  const netzSelection = parseSelection({
    fall: first(query.fall),
    richtung: first(query.richtung),
    knoten: first(query.knoten),
    p: first(query.p),
  });
  const cappedDay =
    modelDay && modelDay.points.length > 0
      ? { ...modelDay, points: capRingPoints(modelDay.points) }
      : modelDay;

  return (
    <>
      <OrtServerShell view={view} scenario={scenario} />
      <OrtSiteDayClient
        modelDay={cappedDay}
        netzSelection={netzSelection}
        view={view}
        scenario={scenario}
      />
    </>
  );
}
