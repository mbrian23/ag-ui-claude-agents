"use client";
import { PALETTE } from "agent-core";
import { WidgetCard } from "agent-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LineChartSpec } from "./line-chart";

export function LineChartWidget({ spec }: { spec: LineChartSpec }) {
  return (
    <WidgetCard title={spec.title}>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={spec.data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={spec.xKey} stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip />
            {spec.series.length > 1 && <Legend />}
            {spec.series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}
