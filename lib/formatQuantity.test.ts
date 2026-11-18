import { formatQuantity } from "@/lib/formatQuantity";

describe("formatQuantity", () => {
  it("nutzt typografisches Minus (U+2212) für negative Werte", () => {
    expect(formatQuantity(-2.27, "de", 2)).toBe("\u22122,27");
    expect(formatQuantity(-0.5, "de", 1)).toBe("\u22120,5");
  });
});