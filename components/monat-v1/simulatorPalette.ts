/** Hex palette for simulator SVG (never CSS var() in stroke/fill). */
export function simulatorPalette(dark: boolean) {
  return dark
    ? {
        ink: "#E9EEF2",
        muted: "#9EA3A9",
        grid: "#1F2529",
        flaeche: "#121417",
        bg: "#0B0D0F",
        rust: "#E07A48",
        rustTint: "rgba(224, 122, 72, 0.28)",
        inkTint: "rgba(233, 238, 242, 0.12)",
        winWin: "#6FBF93",
        neutral: "#2A2E32",
        konfliktSchwach: "#D4A05A",
        konfliktHebung: "#E07A48",
        field70: "rgba(90,180,140,0.12)",
      }
    : {
        ink: "#101214",
        muted: "#43474C",
        grid: "#E4E4DC",
        flaeche: "#FFFFFF",
        bg: "#F6F6F3",
        rust: "#B4532A",
        rustTint: "rgba(180, 83, 42, 0.10)",
        inkTint: "rgba(16, 18, 20, 0.10)",
        winWin: "#1B6B45",
        neutral: "#D5D5CD",
        konfliktSchwach: "#C9A46A",
        konfliktHebung: "#B4532A",
        field70: "rgba(27,107,69,0.10)",
      };
}

export type SimulatorPalette = ReturnType<typeof simulatorPalette>;
