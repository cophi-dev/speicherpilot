export type NetzSurface = "night" | "paper";

export type NetzMapPalette = {
  voltage: {
    low: string;
    midlow: string;
    mid: string;
    midhigh: string;
    high: string;
  };
  tip: readonly [string, string, string, string];
  tieGray: string;
  busbar: string;
  lineBelow80: string;
  line80to100: string;
  lineOver100: string;
  storageRing: string;
  nodeAlertRing: string;
  fallbackNode: string;
  histogramBar: string;
  histogramMark: string;
};

/** Map and legend colours for standalone /netz (night) vs embedded paper on /site. */
export const NETZ_PALETTE: Record<NetzSurface, NetzMapPalette> = {
  night: {
    voltage: {
      low: "#4DA3FF",
      midlow: "#8CA3BA",
      mid: "#E1E6EA",
      midhigh: "#E6D2A8",
      high: "#FF8F1F",
    },
    tip: ["#4A5560", "#7C8894", "#B4BEC7", "#E1E6EA"],
    tieGray: "rgb(102, 115, 127)",
    busbar: "#E1E6EA",
    lineBelow80: "rgb(102, 115, 127)",
    line80to100: "#E1E6EA",
    lineOver100: "#FFFFFF",
    storageRing: "#7DFCE6",
    nodeAlertRing: "#FFFFFF",
    fallbackNode: "rgb(102, 115, 127)",
    histogramBar: "#8CA3BA",
    histogramMark: "#7DFCE6",
  },
  paper: {
    voltage: {
      low: "#4DA3FF",
      midlow: "#8C98A4",
      mid: "#8C98A4",
      midhigh: "#E6D2A8",
      high: "#FF8F1F",
    },
    tip: ["#3c444c", "#5f6670", "#8C98A4", "#14181c"],
    tieGray: "#8C98A4",
    busbar: "#8C98A4",
    lineBelow80: "#8C98A4",
    line80to100: "#5f6670",
    lineOver100: "#14181c",
    storageRing: "hsl(185 82% 24%)",
    nodeAlertRing: "#14181c",
    fallbackNode: "#8C98A4",
    histogramBar: "#8C98A4",
    histogramMark: "hsl(185 82% 24%)",
  },
};

export function netzSurfaceFromDemo(surface: "default" | "paper"): NetzSurface {
  return surface === "paper" ? "paper" : "night";
}
