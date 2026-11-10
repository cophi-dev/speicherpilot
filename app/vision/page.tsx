import { VisionPage } from "@/components/research/VisionPage";
import { buildResearchVision } from "@/lib/research/loadResearchVision.server";

export const revalidate = 1800;

export default function VisionRoute() {
  const model = buildResearchVision();
  return <VisionPage model={model} />;
}
