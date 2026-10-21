import { Suspense } from "react";

import { NotizenArchive } from "@/components/notizen/NotizenArchive";
import { Skeleton } from "@/components/ui/skeleton";
import { loadNetzbriefIssues } from "@/lib/loadNetzbrief";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notizen",
  description: "Nummerierte Netzbrief-Ausgaben: Uhr, mehr Speicher, Nord gegen Süd, und eine Erklärung. Nichts wird automatisch gepostet.",
};

export default async function NotizenPage({ searchParams }: { searchParams: Promise<{ format?: string }> }) {
  const params = await searchParams;
  const issues = await loadNetzbriefIssues();
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-64 max-w-[1200px]" />}>
      <NotizenArchive issues={issues} format={params.format ?? "alle"} />
    </Suspense>
  );
}
