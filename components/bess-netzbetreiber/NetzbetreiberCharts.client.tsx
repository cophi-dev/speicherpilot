"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { KnotenPalette } from "@/components/knoten/knotenPalette";
import { formatQuantityUnit } from "@/lib/formatQuantity";
import type { G2BarRow, GrowthBucket } from "@/lib/bessNetzbetreiber/prepareModel";
import { G2_AXIS_CAP_MW } from "@/lib/bessNetzbetreiber/prepareModel";

type ScatterPoint = { name: string; x: number; y: number; fullName: string };

function tickMw(v: number) {
  return v >= 1000 ? formatQuantityUnit(v / 1000, "de", 2, "GW") : formatQuantityUnit(v, "de", 0, "MW");
}

function barValueLabel(row: G2BarRow) {
  if (row.bruttoMw >= 1000) return formatQuantityUnit(row.bruttoMw / 1000, "de", 2, "GW");
  return formatQuantityUnit(row.bruttoMw, "de", 0, "MW");
}

export function NetzbetreiberG2Chart({
  data,
  palette,
  yAxisWidth = 128,
}: {
  data: G2BarRow[];
  palette: KnotenPalette;
  yAxisWidth?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 56, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
        <XAxis type="number" domain={[0, G2_AXIS_CAP_MW]} tick={{ fill: palette.muted, fontSize: 12 }} tickFormatter={tickMw} />
        <YAxis
          type="category"
          dataKey="shortLabel"
          width={yAxisWidth}
          tick={{ fill: palette.ink, fontSize: 12 }}
          interval={0}
        />
        <Tooltip
          formatter={(v) => [tickMw(Number(v ?? 0)), "dargestellt"]}
          labelFormatter={(_, p) => (p?.[0]?.payload as G2BarRow)?.fullLabel ?? ""}
          contentStyle={{ fontSize: 12 }}
        />
        <ReferenceLine
          x={50}
          stroke={palette.gray}
          strokeDasharray="4 4"
          label={{ value: "50 MW", fill: palette.muted, fontSize: 11, position: "insideTopRight" }}
        />
        <Bar dataKey="displayMw" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((row) => (
            <Cell key={row.key} fill={row.isEonGroup ? palette.teal : palette.gray} />
          ))}
          <LabelList
            dataKey="bruttoMw"
            position="right"
            formatter={(v) => {
              const mw = Number(v ?? 0);
              const label = mw >= 1000 ? formatQuantityUnit(mw / 1000, "de", 2, "GW") : formatQuantityUnit(mw, "de", 0, "MW");
              return mw > 1000 ? `${label} ▶` : label;
            }}
            style={{ fill: palette.ink, fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetzbetreiberG3Chart({
  data,
  palette,
  yAxisWidth = 132,
}: {
  data: GrowthBucket[];
  palette: KnotenPalette;
  yAxisWidth?: number;
}) {
  const chartData = data.map((g) => ({
    name: g.label.length > 20 ? `${g.label.slice(0, 18)}…` : g.label,
    fullLabel: g.label,
    vor2026: g.vor2026Mw,
    neu2026: g.y2026Mw,
    total: g.vor2026Mw + g.y2026Mw,
  }));
  const xMax = Math.max(...chartData.map((d) => d.total), 1) * 1.08;
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 52)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
        <XAxis type="number" domain={[0, xMax]} tickFormatter={tickMw} tick={{ fill: palette.muted, fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={yAxisWidth} tick={{ fill: palette.ink, fontSize: 12 }} interval={0} />
        <Tooltip formatter={(v) => tickMw(Number(v ?? 0))} labelFormatter={(_, p) => p?.[0]?.payload?.fullLabel ?? ""} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="vor2026" name="vor 2026" stackId="a" fill={palette.gray} isAnimationActive={false} />
        <Bar dataKey="neu2026" name="Zubau 2026" stackId="a" fill={palette.teal} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetzbetreiberG4Chart({ data, palette }: { data: ScatterPoint[]; palette: KnotenPalette }) {
  const yMax = Math.max(...data.map((d) => d.y), 0.05) * 1.15;
  const xMax = Math.max(...data.map((d) => d.x), 1) * 1.05;
  return (
    <ResponsiveContainer width="100%" height={360}>
      <ScatterChart margin={{ left: 8, right: 24, top: 12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, xMax]}
          tick={{ fill: palette.muted, fontSize: 12 }}
          tickFormatter={(v) => formatQuantityUnit(Number(v), "de", 0, "GWh")}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, yMax]}
          tick={{ fill: palette.muted, fontSize: 12 }}
          tickFormatter={(v) => formatQuantityUnit(Number(v), "de", 2, "GW")}
        />
        <Tooltip
          formatter={(val, key) =>
            key === "x"
              ? [formatQuantityUnit(Number(val), "de", 1, "GWh"), "EE-Redispatch 2025"]
              : [formatQuantityUnit(Number(val), "de", 2, "GW"), "BESS Brutto"]
          }
          labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""}
        />
        <Scatter data={data} fill={palette.teal} isAnimationActive={false}>
          <LabelList dataKey="name" position="top" offset={8} style={{ fill: palette.ink, fontSize: 10 }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}