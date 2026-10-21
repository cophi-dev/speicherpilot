import type { Metadata } from "next";

import { MissingPage } from "@/components/not-found/MissingPage";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
};

export default function NotFound() {
  return <MissingPage />;
}
