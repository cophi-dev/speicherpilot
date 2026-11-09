import { readFileSync } from "node:fs";
import { join } from "node:path";

import { loadLargeBatteryFleet } from "@/lib/loadLargeBatteryFleet";
import { loadTagRollSnapshot } from "@/lib/tagRollSnapshot.server";

describe("/ort fleet source", () => {
  it("page uses live fleet before roll-snapshot fallback", () => {
    const src = readFileSync(join(process.cwd(), "app/ort/page.tsx"), "utf8");
    expect(src).toContain("loadLargeBatteryFleet");
    expect(src).toMatch(/liveFleet\?\.powerGw.*snap\.fleet\.powerGw/s);
  });

  it("live dispatch and snapshot are both loadable", async () => {
    const snap = loadTagRollSnapshot();
    const live = await loadLargeBatteryFleet();
    expect(snap.fleet.powerGw).toBeGreaterThan(0);
    expect(live?.powerGw).toBeGreaterThan(0);
  });
});
