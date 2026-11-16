import { tagIndexPointsToToday, tagIndexRedirectTarget } from "@/lib/liveTagConfig";

describe("liveTagConfig", () => {
  const original = process.env.SPEICHERPILOT_TAG_INDEX_HEUTE;

  afterEach(() => {
    process.env.SPEICHERPILOT_TAG_INDEX_HEUTE = original;
  });

  it("hält /tag standardmäßig auf dem letzten vollständigen Tag", () => {
    delete process.env.SPEICHERPILOT_TAG_INDEX_HEUTE;
    expect(tagIndexPointsToToday()).toBe(false);
    expect(tagIndexRedirectTarget("2026-11-14", "2026-11-13")).toBe("2026-11-13");
  });

  it("schaltet mit SPEICHERPILOT_TAG_INDEX_HEUTE=1 auf heute", () => {
    process.env.SPEICHERPILOT_TAG_INDEX_HEUTE = "1";
    expect(tagIndexPointsToToday()).toBe(true);
    expect(tagIndexRedirectTarget("2026-11-14", "2026-11-13")).toBe("2026-11-14");
  });
});