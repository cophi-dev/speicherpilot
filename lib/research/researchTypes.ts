import type { ResearchFactor } from "@/lib/research/fleetBasis";

export type { ResearchFactor };

export type ResearchStageResult = {
  factor: ResearchFactor;
  reductionGw: number;
  capGw: number;
  reduction4hGw: number;
};

export type ResearchDaySeriesPoint = {
  hour: number;
  minute: number;
  residualGw: number;
  cappedGw: number;
};

export type ResearchDayModel = {
  dateKey: string;
  dateLabel: string;
  shortLabel: string;
  weekdayLabel: string;
  peakGw: number;
  peakTime: string;
  residualGw: number[];
  stages: ResearchStageResult[];
  series: ResearchDaySeriesPoint[];
  saturation: Array<{ factor: number; reductionGw: number }>;
  saturation4h: Array<{ factor: number; reductionGw: number }>;
  h1: string;
  heroFactor: ResearchFactor;
  heroReductionGw: number;
  hero4hGw: number;
  tenGw: number;
};

export type ResearchWeekDay = {
  dateKey: string;
  shortLabel: string;
  weekdayShort: string;
  isFocus: boolean;
  points: Array<{
    factor: ResearchFactor;
    reduction175Gw: number;
    reduction4hGw: number;
    dayLimitGw: number;
    marker175: "hollow" | "dashed";
    marker4h: "tick" | "square" | "double";
  }>;
};

export type ResearchCloudPoint = {
  date: string;
  x2: number;
  x5: number;
  x10: number;
};

export type ResearchCloudModel = {
  points: ResearchCloudPoint[];
  median: { x2: number; x5: number; x10: number };
  p10: { x2: number; x5: number; x10: number };
  p90: { x2: number; x5: number; x10: number };
  yesterday: { x2: number; x5: number; x10: number };
};

export type ResearchHomeModel = {
  day: ResearchDayModel;
  week: ResearchWeekDay[];
  weekHeadline: string;
  cloud: ResearchCloudModel;
  fleetLabel: string;
};

export type VisionStageId = "x2" | "x5" | "x10" | "nep-a" | "nep-b" | "nep-c";

export type VisionCurvePoint = {
  id: VisionStageId | "x1";
  label: string;
  powerGw: number;
  senkungGw: Record<"1.76" | "2" | "4", number>;
};

export type VisionPageModel = {
  monthLabel: string;
  peakGw: number;
  commitmentsGw: number;
  curve: VisionCurvePoint[];
  defaultDuration: "2";
  defaultStage: VisionStageId;
};
