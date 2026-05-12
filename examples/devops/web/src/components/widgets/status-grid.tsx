import { defineWidget, STATUS_COLOR } from "agent-core";
import { cardStyle } from "agent-pdf/primitives";
import { WidgetCard } from "agent-react";
import { Text, View } from "@react-pdf/renderer";
import { z } from "zod";

export const StatusGridSpecSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      label: z.string(),
      status: z.enum(["ok", "warn", "error"]),
      meta: z.string().optional(),
    })
  ),
});
export type StatusGridSpec = z.infer<typeof StatusGridSpecSchema>;

const dot: Record<StatusGridSpec["items"][number]["status"], string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-rose-500",
};

const ring: Record<StatusGridSpec["items"][number]["status"], string> = {
  ok: "ring-emerald-200",
  warn: "ring-amber-200",
  error: "ring-rose-200",
};

export function StatusGridWidget({ spec }: { spec: StatusGridSpec }) {
  return (
    <WidgetCard title={spec.title}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {spec.items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 ring-1 ${ring[item.status]}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${dot[item.status]}`} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-800">{item.label}</div>
              {item.meta && (
                <div className="truncate text-xs text-slate-500">{item.meta}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

export function StatusGridPdf({ spec }: { spec: StatusGridSpec }) {
  return (
    <View style={cardStyle}>
      <Text style={{ fontSize: 11, marginBottom: 6, color: "#0f172a" }}>{spec.title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {spec.items.map((item, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 4,
              padding: 6,
              width: "32%",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: STATUS_COLOR[item.status] ?? "#94a3b8",
                marginRight: 6,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: "#0f172a" }}>{item.label}</Text>
              {item.meta && <Text style={{ fontSize: 8, color: "#64748b" }}>{item.meta}</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export const statusGridWidget = defineWidget({
  name: "status_grid",
  description: "Per-item health badge grid. Status is one of ok | warn | error.",
  schema: StatusGridSpecSchema,
  render: (spec) => <StatusGridWidget spec={spec} />,
  renderPdf: (spec) => <StatusGridPdf spec={spec} />,
  toMarkdown: (spec) => {
    const dotChar: Record<StatusGridSpec["items"][number]["status"], string> = {
      ok: "🟢",
      warn: "🟡",
      error: "🔴",
    };
    const lines = spec.items.map(
      (i) => `- ${dotChar[i.status]} **${i.label}** — ${i.status}${i.meta ? ` · ${i.meta}` : ""}`
    );
    return [`**${spec.title}**`, "", ...lines].filter(Boolean).join("\n");
  },
});
