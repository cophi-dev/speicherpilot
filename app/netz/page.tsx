import type { Metadata } from "next";

import { NetzDemo } from "@/components/netz/NetzDemo";
import { loadNetzDemo, parseSelection } from "@/lib/netzDemo";

export const metadata: Metadata = {
  title: "Netzwirkung im Testnetz",
  description: "Szenarien rechnen im Testnetz: Spannung, Auslastung und Kipppunkt eines Speichers. Lehrnetz, kein reales Netz.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Netzwirkung im Testnetz",
    description: "Szenarien rechnen im Testnetz. Lehrnetz, kein reales Netz.",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Netzwirkung im Testnetz",
    description: "Szenarien rechnen im Testnetz. Lehrnetz, kein reales Netz.",
    images: [],
  },
};

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export default async function NetzPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const selection = parseSelection({
    fall: first(query.fall),
    richtung: first(query.richtung),
    knoten: first(query.knoten),
    p: first(query.p),
  });
  return <NetzDemo data={loadNetzDemo()} selection={selection} />;
}
