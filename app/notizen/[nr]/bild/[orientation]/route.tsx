import { ImageResponse } from "next/og";

import { NetzbriefPoster } from "@/components/notizen/NetzbriefPoster";
import { loadNetzbriefIssue } from "@/lib/loadNetzbrief";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ nr: string; orientation: string }> }) {
  const { nr, orientation } = await context.params;
  const issue = await loadNetzbriefIssue(Number(nr));
  if (!issue || (orientation !== "quer" && orientation !== "hoch")) {
    return new Response("Not found", { status: 404 });
  }
  const landscape = orientation === "quer";
  const width = landscape ? 1600 : 1080;
  const height = landscape ? 900 : 1350;
  return new ImageResponse(
    (
      <NetzbriefPoster
        frame={issue.frame}
        statement={issue.statement.de}
        date={issue.dateLabel.de}
        source={issue.licence}
        bars={issue.posterBars}
        width={width}
        height={height}
      />
    ),
    { width, height }
  );
}
