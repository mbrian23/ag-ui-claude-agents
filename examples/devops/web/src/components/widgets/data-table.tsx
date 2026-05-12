import { defineWidget } from "agent-core";
import { cardStyle } from "agent-pdf/primitives";
import { markdownTable, WidgetCard } from "agent-react";
import { Text, View } from "@react-pdf/renderer";
import { z } from "zod";

export const DataTableSpecSchema = z.object({
  title: z.string(),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
});
export type DataTableSpec = z.infer<typeof DataTableSpecSchema>;

export function DataTableWidget({ spec }: { spec: DataTableSpec }) {
  return (
    <WidgetCard title={spec.title}>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {spec.columns.map((c) => (
                <th key={c.key} className="px-3 py-2 text-left font-medium text-slate-600">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100">
                {spec.columns.map((c) => (
                  <td key={c.key} className="px-3 py-2 text-slate-800">
                    {String(row[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {spec.rows.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-slate-500">No rows.</div>
        )}
      </div>
    </WidgetCard>
  );
}

export function DataTablePdf({ spec }: { spec: DataTableSpec }) {
  return (
    <View style={cardStyle}>
      <Text style={{ fontSize: 11, marginBottom: 6, color: "#0f172a" }}>{spec.title}</Text>
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderColor: "#e2e8f0",
          paddingBottom: 4,
        }}
      >
        {spec.columns.map((c) => (
          <Text key={c.key} style={{ flex: 1, fontSize: 9, color: "#64748b" }}>
            {c.label}
          </Text>
        ))}
      </View>
      {spec.rows.map((row, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            paddingTop: 4,
            paddingBottom: 4,
            borderBottomWidth: 0.5,
            borderColor: "#f1f5f9",
          }}
        >
          {spec.columns.map((c) => (
            <Text key={c.key} style={{ flex: 1, fontSize: 9, color: "#0f172a" }}>
              {String(row[c.key] ?? "")}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export const dataTableWidget = defineWidget({
  name: "table",
  description:
    "Tabular data with column definitions. Each row's keys must match the column keys.",
  schema: DataTableSpecSchema,
  render: (spec) => <DataTableWidget spec={spec} />,
  renderPdf: (spec) => <DataTablePdf spec={spec} />,
  toMarkdown: (spec) => {
    if (spec.rows.length === 0) return `**${spec.title}**\n\n_(no rows)_`;
    return [`**${spec.title}**`, "", markdownTable(spec.columns, spec.rows)].join("\n");
  },
});
