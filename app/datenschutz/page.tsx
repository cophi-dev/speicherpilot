import type { Metadata } from "next";

import { socialMeta } from "@/lib/siteOg";

import { PrivacyNotice } from "@/components/legal/PrivacyNotice";

const description =
  "Kurze Information nach Art. 13 DSGVO: Verantwortlicher, Hosting bei Vercel, keine Cookies und keine Konten.";

export const metadata: Metadata = {
  title: "Datenschutz",
  description,
  ...socialMeta({ title: "Datenschutz", description, url: "/datenschutz" }),
};

export default function DatenschutzPage() {
  return <PrivacyNotice />;
}
