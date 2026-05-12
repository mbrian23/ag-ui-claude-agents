import { defineWidget } from "agent-core";
import { cardStyle } from "agent-pdf/primitives";
import { Text, View } from "@react-pdf/renderer";
import { z } from "zod";

export const KpiTileSpecSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  delta: z.number().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
});
export type KpiTileSpec = z.infer<typeof KpiTileSpecSchema>;

const trendColor: Record<NonNullable<KpiTileSpec["trend"]>, string> = {
  up: "text-emerald-600",
  down: "text-rose-600",
  flat: "text-slate-500",
};

const trendArrow: Record<NonNullable<KpiTileSpec["trend"]>, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

function deriveTrend(spec: KpiTileSpec): KpiTileSpec["trend"] {
  if (spec.trend) return spec.trend;
  if (typeof spec.delta !== "number") return undefined;
  return spec.delta > 0 ? "up" : spec.delta < 0 ? "down" : "flat";
}

export function KpiTile({ spec }: { spec: KpiTileSpec }) {
  const trend = deriveTrend(spec);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium uppercase tracking-wide text-slate-500">
        {spec.label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-slate-900">{spec.value}</span>
        {spec.unit && <span className="text-sm text-slate-500">{spec.unit}</span>}
      </div>
      {typeof spec.delta === "number" && trend && (
        <div className={`mt-2 text-sm font-medium ${trendColor[trend]}`}>
          {trendArrow[trend]} {Math.abs(spec.delta)}%
        </div>
      )}
    </div>
  );
}

export function KpiTilePdf({ spec }: { spec: KpiTileSpec }) {
  return (
    <View style={cardStyle}>
      <Text style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>
        {spec.label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
        <Text style={{ fontSize: 22, color: "#0f172a" }}>{String(spec.value)}</Text>
        {spec.unit && (
          <Text style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>{spec.unit}</Text>
        )}
      </View>
      {typeof spec.delta === "number" && (
        <Text
          style={{
            fontSize: 10,
            marginTop: 4,
            color:
              spec.delta > 0 ? "#10b981" : spec.delta < 0 ? "#ef4444" : "#64748b",
          }}
        >
          {spec.delta > 0 ? "↑" : spec.delta < 0 ? "↓" : "→"} {Math.abs(spec.delta)}%
        </Text>
      )}
    </View>
  );
}

export const kpiTileWidget = defineWidget({
  name: "kpi_tile",
  description:
    "Single big metric value with optional unit, delta percent, and trend arrow.",
  schema: KpiTileSpecSchema,
  render: (spec) => <KpiTile spec={spec} />,
  renderPdf: (spec) => <KpiTilePdf spec={spec} />,
  toMarkdown: (spec) => {
    const unit = spec.unit ? ` ${spec.unit}` : "";
    const delta =
      typeof spec.delta === "number" ? ` (${spec.delta > 0 ? "+" : ""}${spec.delta}%)` : "";
    return `**${spec.label}:** ${spec.value}${unit}${delta}`;
  },
});
