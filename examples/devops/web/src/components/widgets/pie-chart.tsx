import { defineWidget } from "agent-core";
import { markdownTable } from "agent-react/markdown";
import { ChartCard, PALETTE } from "agent-pdf/primitives";
import { Path, Svg, Text, View } from "@react-pdf/renderer";
import { z } from "zod";
import { PieChartWidget } from "./pie-chart-web";

export const PieChartSpecSchema = z.object({
  title: z.string(),
  nameKey: z.string(),
  valueKey: z.string(),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
});
export type PieChartSpec = z.infer<typeof PieChartSpecSchema>;

const PIE_SIZE = 200;

export function PieChartPdf({ spec }: { spec: PieChartSpec }) {
  const cx = PIE_SIZE / 2;
  const cy = PIE_SIZE / 2;
  const r = PIE_SIZE / 2 - 14;
  const total =
    spec.data.reduce((acc, row) => acc + Number(row[spec.valueKey] ?? 0), 0) || 1;
  let angle = -Math.PI / 2;

  const slices = spec.data.map((row, i) => {
    const v = Number(row[spec.valueKey] ?? 0);
    const sliceAngle = (v / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sliceAngle;
    angle = end;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = sliceAngle > Math.PI ? 1 : 0;
    return {
      d: `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${large} 1 ${x2},${y2} Z`,
      color: PALETTE[i % PALETTE.length],
      label: String(row[spec.nameKey] ?? ""),
      value: v,
      pct: Math.round((v / total) * 100),
    };
  });

  return (
    <ChartCard title={spec.title}>
      <View style={{ flexDirection: "row" }}>
        <Svg width={PIE_SIZE} height={PIE_SIZE} viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}>
          {slices.map((s, i) => (
            <Path key={i} d={s.d} fill={s.color} stroke="#ffffff" strokeWidth={1} />
          ))}
        </Svg>
        <View style={{ flex: 1, paddingLeft: 12, justifyContent: "center" }}>
          {slices.map((s, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}
            >
              <View style={{ width: 8, height: 8, backgroundColor: s.color, marginRight: 6 }} />
              <Text style={{ fontSize: 9, color: "#0f172a", flex: 1 }}>{s.label}</Text>
              <Text style={{ fontSize: 9, color: "#475569", marginLeft: 6 }}>
                {s.value} ({s.pct}%)
              </Text>
            </View>
          ))}
          <View
            style={{
              marginTop: 4,
              paddingTop: 4,
              borderTopWidth: 0.5,
              borderColor: "#e2e8f0",
              flexDirection: "row",
            }}
          >
            <Text style={{ fontSize: 9, color: "#64748b", flex: 1 }}>Total</Text>
            <Text style={{ fontSize: 9, color: "#0f172a" }}>{total}</Text>
          </View>
        </View>
      </View>
    </ChartCard>
  );
}

export const pieChartWidget = defineWidget({
  name: "pie_chart",
  description: "Share-of-whole pie chart.",
  schema: PieChartSpecSchema,
  render: (spec) => <PieChartWidget spec={spec} />,
  renderPdf: (spec) => <PieChartPdf spec={spec} />,
  toMarkdown: (spec) => {
    if (spec.data.length === 0) return `**${spec.title}**\n\n_(no data)_`;
    return [
      `**${spec.title}**`,
      "",
      markdownTable(
        [
          { key: spec.nameKey, label: spec.nameKey },
          { key: spec.valueKey, label: spec.valueKey },
        ],
        spec.data
      ),
    ].join("\n");
  },
});
