import { indexableTagDayCap } from "@/lib/seo/indexableTagRoutes";

describe("indexableTagDayCap", () => {
  it("schließt heute auch bei vollständigem lastComplete aus", () => {
    expect(indexableTagDayCap("2026-11-16", "2026-11-16")).toBe("2026-11-15");
  });
});