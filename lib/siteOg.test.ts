import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SITE_DESCRIPTION, SITE_OG_IMAGE, SITE_TITLE, socialMeta } from "@/lib/siteOg";

describe("site OG image and social metadata", () => {
  it("keeps the shared 1200×630 PNG in public/", () => {
    const buf = readFileSync(join(process.cwd(), "public", "og", "speicherpilot-og.png"));
    expect(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(10_000);
    expect(buf.byteLength).toBeLessThan(300 * 1024);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(1200);
    expect(height).toBe(630);
  });

  it("exposes the home claim and a complete social payload", () => {
    expect(SITE_TITLE).toBe("SpeicherPilot — Speicher und Netz verständlich");
    expect(SITE_DESCRIPTION).toMatch(/Großspeicher/);
    const meta = socialMeta({
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
    });
    expect(meta.openGraph?.locale).toBe("de_DE");
    expect(meta.openGraph?.siteName).toBe("SpeicherPilot");
    expect(meta.openGraph?.url).toBe("/");
    expect(meta.openGraph?.images).toEqual([SITE_OG_IMAGE]);
    expect(meta.twitter && "card" in meta.twitter ? meta.twitter.card : undefined).toBe("summary_large_image");
    expect(SITE_OG_IMAGE.url).toBe("/og/speicherpilot-og.png");
    expect(SITE_OG_IMAGE.width).toBe(1200);
    expect(SITE_OG_IMAGE.height).toBe(630);
  });
});
