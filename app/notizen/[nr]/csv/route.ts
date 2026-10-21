import { loadNetzbriefIssue, netzbriefCsv } from "@/lib/loadNetzbrief";
import { netzbriefNumber } from "@/lib/netzbrief";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ nr: string }> }) {
  const { nr } = await context.params;
  const issue = await loadNetzbriefIssue(Number(nr));
  if (!issue) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(netzbriefCsv(issue), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="netzbrief-${netzbriefNumber(issue.nr)}.csv"`,
    },
  });
}
