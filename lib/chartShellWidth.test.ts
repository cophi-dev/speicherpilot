import { chartShellContentWidth } from "@/lib/chartShellWidth";

describe("chartShellContentWidth", () => {
  it("zieht Padding von clientWidth ab", () => {
    const el = {
      clientWidth: 1248,
    } as HTMLElement;
    const getComputedStyle = jest.spyOn(window, "getComputedStyle").mockReturnValue({
      paddingLeft: "48px",
      paddingRight: "48px",
    } as CSSStyleDeclaration);
    expect(chartShellContentWidth(el)).toBe(1152);
    getComputedStyle.mockRestore();
  });
});