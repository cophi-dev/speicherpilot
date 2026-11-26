import { render } from "@testing-library/react";

import { RangLeiste } from "@/components/home/RangLeiste";

describe("RangLeiste", () => {
  it("markiert den gestrigen Balken mit Label und is-gestern, nicht als Rekordfüllung", () => {
    const { container } = render(
      <RangLeiste
        bars={[
          { dateKey: "2026-11-24", value: 0, highlight: false, zero: true },
          { dateKey: "2026-11-25", value: 0, highlight: true, zero: true },
        ]}
        metricLabel="Überschuss je Tag"
        rankLabel="Überschuss je Tag"
      />,
    );
    const bar = container.querySelector(".v4-rang-bar.is-gestern");
    expect(bar).not.toBeNull();
    expect(bar!.classList.contains("is-rekord")).toBe(false);
    expect(bar!.querySelector(".v4-rang-bar-tag")?.textContent).toBe("gestern");
  });
});
