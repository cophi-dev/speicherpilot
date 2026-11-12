import { fireEvent, render, screen } from "@testing-library/react";

import { FrontSlider } from "@/components/monat-v1/FrontSlider";

function renderSlider(value = 8, onChange = jest.fn()) {
  render(
    <FrontSlider
      value={value}
      count={18}
      namedIndices={[0, 8, 17]}
      onChange={onChange}
      ariaValueText="Kompromiss: 33,97 Millionen Euro Modellschätzung, Senkung 2,51 GW"
      id="sim-front-range"
    />,
  );
  return onChange;
}

describe("FrontSlider", () => {
  it("exposes role=slider with aria-valuemin/max/now and aria-valuetext", () => {
    renderSlider(8);
    const el = screen.getByTestId("sim-front-slider");
    expect(el).toHaveAttribute("role", "slider");
    expect(el).toHaveAttribute("aria-valuemin", "0");
    expect(el).toHaveAttribute("aria-valuemax", "17");
    expect(el).toHaveAttribute("aria-valuenow", "8");
    expect(el).toHaveAttribute(
      "aria-valuetext",
      "Kompromiss: 33,97 Millionen Euro Modellschätzung, Senkung 2,51 GW",
    );
    expect(el).toHaveAttribute("tabIndex", "0");
  });

  it("moves with keyboard: arrows, Home, End, PageUp, PageDown", () => {
    const onChange = renderSlider(8);
    const el = screen.getByTestId("sim-front-slider");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(9);
    fireEvent.keyDown(el, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(7);
    fireEvent.keyDown(el, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(el, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(17);
    fireEvent.keyDown(el, { key: "PageUp" });
    expect(onChange).toHaveBeenLastCalledWith(11);
    fireEvent.keyDown(el, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it("has no native range input", () => {
    renderSlider();
    expect(document.querySelector('input[type="range"]')).toBeNull();
  });
});
