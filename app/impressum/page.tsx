import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { LegalNotice } from "@/components/legal/LegalNotice";

const description =
  "Anbieterkennzeichnung von SpeicherPilot. Privates Projekt in Hamburg. Die Rechenwerte sind Modellschätzungen, keine Beratung.";

export const metadata: Metadata = {
  title: "Impressum",
  description,
  ...socialMeta({ title: "Impressum", description, url: "/impressum" }),
};

export default function ImpressumPage() {
  return <LegalNotice />;
}
