import type { Metadata } from "next";

import { LegalNotice } from "@/components/legal/LegalNotice";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung von SpeicherPilot. Privates Projekt in Hamburg. Die Rechenwerte sind Modellschätzungen, keine Beratung.",
};

export default function ImpressumPage() {
  return <LegalNotice />;
}
