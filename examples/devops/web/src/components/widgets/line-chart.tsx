import { defineWidget } from "agent-core";
import { markdownTable } from "agent-react/markdown";
import {
  AxisGrid,
  ChartCard,
  DEFAULT_FRAME,
  PALETTE,
  plotArea,
} from "agent-pdf/primitives";
import { Polyline, Svg, Text, View } from "@react-pdf/renderer";
import { z } from "zod";
import { LineChartWidget } from "./line-chart-web";

export const LineChartSpecSchema = z.object({
  title: z.string(),
  xKey: z.string(),
  series: z.array(z.object({ key: z.string(), label: z.string() })),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
});
export type LineChartSpec = z.infer<typeof LineChartSpecSchema>;

export function LineChartPdf({ spec }: { spec: LineChartSpec }) {
  const area = plotArea();
  const allValues = spec.data.flatMap((r) =>
    spec.series.map((s) => Number(r[s.key] ?? 0))
  );
  const max = Math.max(1, ...allValues);
  const n = spec.data.length;
  const dx = n > 1 ? area.w / (n - 1) : 0;
  const xLabelStride = n > 12 ? Math.ceil(n / 8) : 1;

  return (
    <ChartCard title={spec.title}>
      <Svg
        width={DEFAULT_FRAME.width}
        height={DEFAULT_FRAME.height}
        viewBox={`0 0 ${DEFAULT_FRAME.width} ${DEFAULT_FRAME.height}`}
      >
        <AxisGrid area={area} max={max} yLabel={spec.series[0]?.label ?? ""} />
        {spec.series.map((s, si) => {
          const points = spec.data
            .map((row, i) => {
              const v = Number(row[s.key] ?? 0);
              const x = area.x + i * dx;
              const y = area.y + area.h - (v / max) * area.h;
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <Polyline
              key={s.key}
              points={points}
              fill="none"
              stroke={PALETTE[si % PALETTE.length]}
              strokeWidth={1.5}
            />
          );
        })}
        {spec.data.map((row, i) =>
          i % xLabelStride === 0 ? (
            <Text
              key={i}
              x={area.x + i * dx}
              y={area.y + area.h + 12}
              fill="#475569"
              style={{ fontSize: 7, textAnchor: "middle" } as object}
            >
              {String(row[spec.xKey] ?? "")}
            </Text>
          ) : null
        )}
      </Svg>
      {spec.series.length > 1 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 8 }}>
          {spec.series.map((s, si) => (
            <View key={s.key} style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 10,
                  height: 2,
                  backgroundColor: PALETTE[si % PALETTE.length],
                  marginRight: 4,
                }}
              />
              <Text style={{ fontSize: 8, color: "#475569" }}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </ChartCard>
  );
}

export const lineChartWidget = defineWidget({
  name: "line_chart",
  description: "Time-series line chart with one or more series; xKey is the time bucket.",
  schema: LineChartSpecSchema,
  render: (spec) => <LineChartWidget spec={spec} />,
  renderPdf: (spec) => <LineChartPdf spec={spec} />,
  toMarkdown: (spec) => {
    if (spec.data.length === 0) return `**${spec.title}**\n\n_(no data)_`;
    const cols = [
      { key: spec.xKey, label: spec.xKey },
      ...spec.series.map((s) => ({ key: s.key, label: s.label })),
    ];
    return [`**${spec.title}**`, "", markdownTable(cols, spec.data)].join("\n");
  },
});
