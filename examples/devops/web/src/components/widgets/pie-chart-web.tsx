"use client";
import { PALETTE } from "agent-core";
import { WidgetCard } from "agent-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PieChartSpec } from "./pie-chart";

export function PieChartWidget({ spec }: { spec: PieChartSpec }) {
  return (
    <WidgetCard title={spec.title}>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={spec.data}
              dataKey={spec.valueKey}
              nameKey={spec.nameKey}
              outerRadius={90}
              label
            >
              {spec.data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}
