import type { Metadata } from "next";

import { MissingPage } from "@/components/not-found/MissingPage";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  description: "Diese Seite gibt es nicht. Zurück zum Ring und zur Abendspitze.",
};

export default function NotFound() {
  return <MissingPage />;
}
