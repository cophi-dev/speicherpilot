import type { Metadata } from "next";

import { PrivacyNotice } from "@/components/legal/PrivacyNotice";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Kurze Information nach Art. 13 DSGVO: Verantwortlicher, Hosting bei Vercel, keine Cookies und keine Konten.",
};

export default function DatenschutzPage() {
  return <PrivacyNotice />;
}
