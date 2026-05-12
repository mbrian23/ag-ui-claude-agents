import { PALETTE, STATUS_COLOR } from "agent-core";
import { G, Path, Svg, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

export { PALETTE, STATUS_COLOR };

export const cardStyle = {
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 6,
  padding: 12,
  backgroundColor: "#ffffff",
} as const;

export interface ChartFrame {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export const DEFAULT_FRAME: ChartFrame = {
  width: 480,
  height: 200,
  margin: { top: 10, right: 10, bottom: 26, left: 36 },
};

export interface PlotArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function plotArea(frame: ChartFrame = DEFAULT_FRAME): PlotArea {
  return {
    x: frame.margin.left,
    y: frame.margin.top,
    w: frame.width - frame.margin.left - frame.margin.right,
    h: frame.height - frame.margin.top - frame.margin.bottom,
  };
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={cardStyle}>
      <Text style={{ fontSize: 11, marginBottom: 6, color: "#0f172a" }}>{title}</Text>
      {children}
    </View>
  );
}

export interface AxisGridProps {
  area: PlotArea;
  max: number;
  yLabel?: string;
  ticks?: number;
}

/**
 * Standard horizontal grid + Y-axis ticks + optional rotated Y label.
 * Use inside an `<Svg>` element. Pair with `plotArea()` for sizing.
 */
export function AxisGrid({ area, max, yLabel, ticks = 4 }: AxisGridProps) {
  return (
    <G>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = area.y + (area.h / ticks) * i;
        const value = Math.round(max - (max / ticks) * i);
        return (
          <G key={i}>
            <Path
              d={`M ${area.x},${y} L ${area.x + area.w},${y}`}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
            <Text
              x={area.x - 4}
              y={y + 3}
              fill="#64748b"
              style={{ fontSize: 7, textAnchor: "end" } as object}
            >
              {String(value)}
            </Text>
          </G>
        );
      })}
      <Path
        d={`M ${area.x},${area.y} L ${area.x},${area.y + area.h}`}
        stroke="#cbd5e1"
        strokeWidth={0.5}
      />
      {yLabel && (
        <Text
          x={6}
          y={area.y + area.h / 2}
          fill="#94a3b8"
          style={{ fontSize: 6, textAnchor: "middle" } as object}
          transform={`rotate(-90 6 ${area.y + area.h / 2})`}
        >
          {yLabel}
        </Text>
      )}
    </G>
  );
}

