import { notFound } from "next/navigation";
import { Suspense } from "react";

import { NotizenIssue } from "@/components/notizen/NotizenIssue";
import { Skeleton } from "@/components/ui/skeleton";
import { loadNetzbriefIssue } from "@/lib/loadNetzbrief";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params;
  const issue = await loadNetzbriefIssue(Number(nr));
  if (!issue) {
    return { title: "Notiz" };
  }
  return {
    title: issue.statement.de,
    description: issue.frame,
  };
}

export default async function NotizPage({ params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params;
  const issue = await loadNetzbriefIssue(Number(nr));
  if (!issue) {
    notFound();
  }
  return (
    <Suspense fallback={<Skeleton className="mx-auto mt-8 h-64 max-w-[980px]" />}>
      <NotizenIssue issue={issue} />
    </Suspense>
  );
}
