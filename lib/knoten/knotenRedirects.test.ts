import nextConfig from "../../next.config";

describe("Knoten-Redirects (Menü A)", () => {
  it("leitet /ort, /netz, /site und /szenarien dauerhaft auf /knoten um", async () => {
    const redirects = await nextConfig.redirects!();
    const sources = [
      "/ort",
      "/ort/:path*",
      "/site",
      "/site/:path*",
      "/netz",
      "/netz/:path*",
      "/szenarien",
      "/szenarien/:path*",
    ];
    for (const source of sources) {
      const rule = redirects.find((item) => item.source === source);
      expect(rule).toBeDefined();
      expect(rule!.destination).toBe("/knoten");
      expect(rule!.permanent).toBe(true);
    }
  });

  it("lässt /simulator auf /kompromiss und vermeidet Schleifen", async () => {
    const redirects = await nextConfig.redirects!();
    const sim = redirects.find((item) => item.source === "/simulator");
    expect(sim?.destination).toBe("/kompromiss");
    const knotenFromSim = redirects.find(
      (item) => item.source === "/simulator" && item.destination === "/knoten",
    );
    expect(knotenFromSim).toBeUndefined();
  });
});