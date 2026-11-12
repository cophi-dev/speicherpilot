/** Hex palette for simulator SVG (never CSS var() in stroke/fill). */
export function simulatorPalette(dark: boolean) {
  return dark
    ? {
        ink: "#E9EEF2",
        muted: "#9EA3A9",
        grid: "#1F2529",
        flaeche: "#121417",
        rust: "#B4532A",
        winWin: "#6FBF93",
        neutral: "#2A2E32",
        konfliktSchwach: "#8B5A1A",
        konfliktHebung: "#B4532A",
        field70: "rgba(90,180,140,0.12)",
      }
    : {
        ink: "#101214",
        muted: "#43474C",
        grid: "#E4E4DC",
        flaeche: "#FFFFFF",
        rust: "#B4532A",
        winWin: "#1B6B45",
        neutral: "#D5D5CD",
        konfliktSchwach: "#C9A46A",
        konfliktHebung: "#B4532A",
        field70: "rgba(27,107,69,0.10)",
      };
}
