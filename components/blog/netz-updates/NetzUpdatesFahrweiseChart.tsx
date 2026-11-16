import { loadNetzUpdatesFahrweiseDay } from "@/lib/netzUpdatesChartData.server";

import { NetzUpdatesFahrweiseChartSvg } from "@/components/blog/netz-updates/NetzUpdatesFahrweiseChartSvg";

export function NetzUpdatesFahrweiseChart() {
  const data = loadNetzUpdatesFahrweiseDay();
  return <NetzUpdatesFahrweiseChartSvg data={data} />;
}