/** SVG hex palette for /knoten (never CSS var() in stroke/fill). */
export function knotenPalette(dark: boolean) {
  return dark
    ? {
        ink: "#E9EEF2",
        muted: "#9EA3A9",
        grid: "#1F2529",
        flaeche: "#121417",
        rust: "#F4A261",
        teal: "#3DB8B4",
        gray: "#6B7580",
        rot: "#EF5350",
        hatch: "#EF5350",
      }
    : {
        ink: "#101214",
        muted: "#43474C",
        grid: "#E4E4DC",
        flaeche: "#FFFFFF",
        rust: "#b4532a",
        teal: "#0F6E6B",
        gray: "#9AA5AD",
        rot: "#C62828",
        hatch: "#C62828",
      };
}

export type KnotenPalette = ReturnType<typeof knotenPalette>;