import Link from "next/link";

export function GraphScopeMeta() {
  return (
    <p className="v4-fleet-graph-meta num">
      Modell · national ·{" "}
      <Link href="/kompromiss" className="v4-text-link">
        Szenarien rechnen
      </Link>
    </p>
  );
}