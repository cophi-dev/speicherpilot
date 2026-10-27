import type { Metadata } from "next";
import { Suspense } from "react";

import { SzenarienPending, SzenarienRechner } from "@/components/szenarien/SzenarienRechner";

export const metadata: Metadata = {
  title: "Szenarien rechnen",
  description:
    "Modellrechnung für einen Speicher an einem Netzknoten: voller Anschluss, flexible Anschlussvereinbarung und verzögerter Anschluss. Keine Aussage zur Aufnahmefähigkeit.",
  openGraph: {
    title: "Szenarien rechnen",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Szenarien rechnen",
    description: "Modellrechnung für einen Speicher an einem Netzknoten.",
    images: [],
  },
};

export default function SzenarienPage() {
  return (
    <Suspense fallback={<SzenarienPending />}>
      <SzenarienRechner />
    </Suspense>
  );
}
