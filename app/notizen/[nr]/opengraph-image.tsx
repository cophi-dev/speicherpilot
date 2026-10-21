import { ImageResponse } from "next/og";

import { NetzbriefPoster } from "@/components/notizen/NetzbriefPoster";
import { loadNetzbriefIssue } from "@/lib/loadNetzbrief";

export const dynamic = "force-dynamic";
export const alt = "SpeicherPilot Netzbrief";
export const size = { width: 1600, height: 900 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params;
  const issue = await loadNetzbriefIssue(Number(nr));
  const frame = issue?.frame ?? "SPEICHERPILOT · NETZBRIEF";
  const statement = issue?.statement.de ?? "Notiz";
  return new ImageResponse(
    (
      <NetzbriefPoster
        frame={frame}
        statement={statement}
        date={issue?.dateLabel.de ?? ""}
        source={issue?.licence ?? ""}
        bars={issue?.posterBars ?? []}
        width={size.width}
        height={size.height}
      />
    ),
    size
  );
}
