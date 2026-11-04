import { OrtServerShell } from "@/components/site/OrtServerShell";
import { OrtSiteDayClient } from "@/components/site/OrtSiteDayClient";
import { capRingPoints } from "@/lib/capRingPoints";
import { loadReferenceParkModelDay } from "@/lib/loadReferenceParkModelDay";
import { parsePerspective, parseScenario, defaultScenario, type ScenarioId } from "@/lib/perspective";

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
      description: "Netzsicht: derselbe Speicher an zwei SimBench-Orten, fest und flexibel angeschlossen.",
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
  const scenario = parseScenario(first(query.scenario)) ?? defaultScenario(view);
  const modelDay = await loadReferenceParkModelDay();
  const cappedDay =
    modelDay && modelDay.points.length > 0
      ? { ...modelDay, points: capRingPoints(modelDay.points) }
      : modelDay;

  return (
    <div className="ort-v4-page v4-subpage ort-v4">
      <OrtServerShell view={view} scenario={scenario} />
      <OrtSiteDayClient modelDay={cappedDay} view={view} scenario={scenario} />
    </div>
  );
}
