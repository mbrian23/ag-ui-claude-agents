import { defineWidget } from "agent-core";
import { markdownTable } from "agent-react/markdown";
import {
  AxisGrid,
  ChartCard,
  DEFAULT_FRAME,
  PALETTE,
  plotArea,
} from "agent-pdf/primitives";
import { G, Rect, Svg, Text } from "@react-pdf/renderer";
import { z } from "zod";
import { BarChartWidget } from "./bar-chart-web";

export const BarChartSpecSchema = z.object({
  title: z.string(),
  xKey: z.string(),
  yKey: z.string(),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  orientation: z.enum(["vertical", "horizontal"]).optional(),
});
export type BarChartSpec = z.infer<typeof BarChartSpecSchema>;

export function BarChartPdf({ spec }: { spec: BarChartSpec }) {
  const area = plotArea();
  const values = spec.data.map((r) => Number(r[spec.yKey] ?? 0));
  const max = Math.max(1, ...values);
  const n = spec.data.length;
  const slot = n > 0 ? area.w / n : 0;
  const barWidth = Math.max(2, slot * 0.7);

  return (
    <ChartCard title={spec.title}>
      <Svg
        width={DEFAULT_FRAME.width}
        height={DEFAULT_FRAME.height}
        viewBox={`0 0 ${DEFAULT_FRAME.width} ${DEFAULT_FRAME.height}`}
      >
        <AxisGrid area={area} max={max} yLabel={spec.yKey} />
        {spec.data.map((row, i) => {
          const v = Number(row[spec.yKey] ?? 0);
          const h = (v / max) * area.h;
          const x = area.x + i * slot + (slot - barWidth) / 2;
          const y = area.y + area.h - h;
          return (
            <G key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                fill={PALETTE[i % PALETTE.length]}
              />
              <Text
                x={x + barWidth / 2}
                y={y - 3}
                fill="#0f172a"
                style={{ fontSize: 7, textAnchor: "middle" } as object}
              >
                {String(v)}
              </Text>
              <Text
                x={x + barWidth / 2}
                y={area.y + area.h + 12}
                fill="#475569"
                style={{ fontSize: 7, textAnchor: "middle" } as object}
              >
                {String(row[spec.xKey] ?? "")}
              </Text>
            </G>
          );
        })}
      </Svg>
    </ChartCard>
  );
}

export const barChartWidget = defineWidget({
  name: "bar_chart",
  description: "Categorical bar chart. xKey/yKey must match keys present in every row of `data`.",
  schema: BarChartSpecSchema,
  render: (spec) => <BarChartWidget spec={spec} />,
  renderPdf: (spec) => <BarChartPdf spec={spec} />,
  toMarkdown: (spec) => {
    if (spec.data.length === 0) return `**${spec.title}**\n\n_(no data)_`;
    return [
      `**${spec.title}**`,
      "",
      markdownTable(
        [
          { key: spec.xKey, label: spec.xKey },
          { key: spec.yKey, label: spec.yKey },
        ],
        spec.data
      ),
    ].join("\n");
  },
});
