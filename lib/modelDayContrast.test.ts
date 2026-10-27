import { readFileSync } from "node:fs";

function channel(hex: string, index: number): number {
  const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string): number {
  const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
  const [hi, lo] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

describe("MODELLTAG pill contrast", () => {
  it("stays at least 4.5 to 1 on the dark hero and on a light surface", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain("stroke: #e2b15a");
    expect(css).toContain("fill: #e2b15a");
    expect(css).toContain("stroke: #8a4b08");
    expect(css).toMatch(/\.day-model-caption\s*\{[^}]*font-size:\s*14px/);
    expect(css).toMatch(/\.day-model-caption\s*\{[^}]*letter-spacing:\s*0/);
    expect(css).toMatch(/\.day-model-caption\s*\{[^}]*font-kerning:\s*normal/);
    expect(css).toMatch(/\.day-model-rule\s*\{[^}]*margin:\s*8px auto 0/);
    expect(css).toMatch(/\.day-model-rule\s*\{[^}]*font-size:\s*14px/);
    expect(css).toMatch(/\.day-model-rule\s*\{[^}]*letter-spacing:\s*0/);
    expect(css).toMatch(/\.day-model-rule\s*\{[^}]*color:\s*#c5ced6/);
    expect(css).toMatch(/\.day-model-rule-link a\s*\{[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.site-facts dt\s*\{[^}]*font-size:\s*14px/);
    expect(css).toMatch(/\.site-facts dt\s*\{[^}]*color:\s*#e9eef2/);
    expect(css).not.toMatch(/\.site-model-ring\s*\{[^}]*order:\s*-1/);
    expect(contrast("#ff8a70", "#0a0f14")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#1e9cb0", "#0a0f14")).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.day-soc-edge\s*\{[^}]*vector-effect:\s*non-scaling-stroke/);
    expect(contrast("#e2b15a", "#0a0f14")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#e9eef2", "#0a0f14")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#c5ced6", "#0a0f14")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#9bf6e6", "#0a0f14")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#8a4b08", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#8a4b08", "#f6f6f1")).toBeGreaterThanOrEqual(4.5);
  });
});