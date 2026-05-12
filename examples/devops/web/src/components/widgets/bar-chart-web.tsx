"use client";
// Recharts has to live in a "use client" file. Splitting it out means the
// parent widget definition (bar-chart.tsx) can stay server-friendly — Next
// turns every export of a "use client" module into a client reference,
// which would zero out the widget object's `.name` field server-side.
import { WidgetCard } from "agent-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarChartSpec } from "./bar-chart";

export function BarChartWidget({ spec }: { spec: BarChartSpec }) {
  const horizontal = spec.orientation === "horizontal";
  return (
    <WidgetCard title={spec.title}>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart
            data={spec.data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 5, right: 10, bottom: 5, left: horizontal ? 60 : 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            {horizontal ? (
              <>
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey={spec.xKey}
                  stroke="#64748b"
                  fontSize={12}
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis dataKey={spec.xKey} stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
              </>
            )}
            <Tooltip />
            <Bar dataKey={spec.yKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}
