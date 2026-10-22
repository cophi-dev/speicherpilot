import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "News",
  description: "Geprüfte Meldungen zum Speichermarkt, mit Quelle und Datum.",
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
