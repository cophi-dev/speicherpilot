import { spacedTicks } from "@/components/mix/MixChart";

describe("spacedTicks", () => {
  it("drops a clock mark that sits under the open jetzt label", () => {
    const ticks = [
      { text: "So 18.10.", x: 40 },
      { text: "So 25.10.", x: 400 },
      { text: "jetzt/09:45", x: 440 },
    ];
    expect(spacedTicks(ticks).map((tick) => tick.text)).toEqual(["So 18.10.", "jetzt/09:45"]);
  });

  it("keeps a mark whose ink ends at least 56 px before jetzt", () => {
    const ticks = [
      { text: "So 18.10.", x: 40, anchor: "middle" as const },
      { text: "So 25.10.", x: 200, anchor: "middle" as const },
      { text: "jetzt/09:45", x: 520, anchor: "end" as const },
    ];
    expect(spacedTicks(ticks)).toHaveLength(3);
  });
});
