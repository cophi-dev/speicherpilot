import { getPublicSiteOrigin } from "@/lib/publicSiteUrl";

describe("getPublicSiteOrigin", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("uses the production domain on Vercel production", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    expect(getPublicSiteOrigin()).toBe("https://www.speicherpilot.app");
  });

  it("prefers NEXT_PUBLIC_SITE_URL outside production", () => {
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.test/";
    expect(getPublicSiteOrigin()).toBe("https://preview.example.test");
  });

  it("falls back to VERCEL_URL on preview builds", () => {
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "my-app.vercel.app";
    expect(getPublicSiteOrigin()).toBe("https://my-app.vercel.app");
  });
});
