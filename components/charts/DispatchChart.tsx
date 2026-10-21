"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AppLanguage } from "@/components/language-context";
import { axis, common, cssVar, fmtPower, grid, limitLine, series, tooltip } from "@/lib/chart-theme";

export type DispatchPoint = {
  label: string;
  load: number;
  grid: number;
  bess: number;
  pv: number;
};

export function useNarrowScreen() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export function ChartLegend({
  items,
}: {
  items: { label: string; swatch: "line" | "line-bold" | "teal" | "teal-dim" | "dashed" | "pv" }[];
}) {
  return (
    <ul className="num mt-2 flex max-w-full gap-x-4 gap-y-1 overflow-x-auto text-[12px] text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="inline-flex shrink-0 items-center gap-1.5">
          <Swatch kind={item.swatch} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Swatch({ kind }: { kind: "line" | "line-bold" | "teal" | "teal-dim" | "dashed" | "pv" }) {
  if (kind === "teal" || kind === "teal-dim" || kind === "pv") {
    return (
      <i
        aria-hidden
        className="inline-block h-2.5 w-2.5"
        style={{
          background: kind === "pv" ? cssVar("c-pv") : cssVar("c-bess"),
          opacity: kind === "teal-dim" ? 0.35 : 1,
        }}
      />
    );
  }
  if (kind === "dashed") {
    return <i aria-hidden className="inline-block h-0.5 w-3 border-t border-dashed border-limit" />;
  }
  return (
    <i
      aria-hidden
      className="inline-block h-0.5 w-3"
      style={{ background: cssVar("c-load"), height: kind === "line-bold" ? 3 : 2, opacity: kind === "line" ? 0.55 : 1 }}
    />
  );
}

export function DispatchChart({
  points,
  limitKw,
  language,
  height,
}: {
  points: DispatchPoint[];
  limitKw: number;
  language: AppLanguage;
  height?: number;
}) {
  const narrow = useNarrowScreen();
  const chartHeight = height ?? (narrow ? 240 : 320);
  const limitLabel = language === "de" ? "Netzanschluss" : "Connection";
  return (
    <div className="w-full min-w-0" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: narrow ? 8 : 16, bottom: 0, left: 0 }}>
          <defs>
            <pattern id="hatch-curtail" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--c-curtail))" strokeWidth="1.5" />
            </pattern>
          </defs>
          <CartesianGrid {...grid} />
          <XAxis dataKey="label" {...axis} interval={narrow ? 23 : 11} />
          <YAxis {...axis} width={56} tickFormatter={(value: number) => fmtPower(value, language)} />
          <Tooltip
            {...tooltip}
            formatter={(value, name) => [fmtPower(Number(value), language), String(name)]}
          />
          <Bar dataKey="bess" name={language === "de" ? "Speicher" : "Storage"} barSize={narrow ? 2 : 3} {...common.bar}>
            {points.map((point, index) => (
              <Cell key={`${point.label}-${index}`} fill={point.bess >= 0 ? series.discharge.fill : series.charge.fill} />
            ))}
          </Bar>
          <Line dataKey="pv" name="PV" type="monotone" {...common.line} stroke={series.pv.stroke} strokeWidth={series.pv.strokeWidth} dot={false} />
          <Line dataKey="load" name={language === "de" ? "Last ohne BESS" : "Load without BESS"} type="stepAfter" {...common.line} {...series.load} />
          <Line dataKey="grid" name={language === "de" ? "Netzbezug mit BESS" : "Grid with BESS"} type="stepAfter" {...common.line} {...series.netLoad} />
          {limitKw > 0 ? <ReferenceLine {...limitLine(limitKw, limitLabel)} /> : null}
          <ReferenceLine y={0} stroke={cssVar("border-strong")} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
