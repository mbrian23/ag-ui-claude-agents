/**
 * The DevOps widget catalog: the agent's render_widget tool can emit any
 * of these. To add or remove a widget, edit this list — both the web
 * registry (used by <ChatShell>) and the PDF registry (used by the
 * /api/export/pdf route) read from the same source.
 */
import { barChartWidget } from "./widgets/bar-chart";
import { dataTableWidget } from "./widgets/data-table";
import { kpiTileWidget } from "./widgets/kpi-tile";
import { lineChartWidget } from "./widgets/line-chart";
import { pieChartWidget } from "./widgets/pie-chart";
import { statusGridWidget } from "./widgets/status-grid";

export const devopsWidgets = [
  kpiTileWidget,
  barChartWidget,
  lineChartWidget,
  pieChartWidget,
  dataTableWidget,
  statusGridWidget,
] as const;
