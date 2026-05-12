import { createPdfRoute } from "agent-pdf";
import { devopsWidgets } from "@/components/widget-catalog";

export const runtime = "nodejs";

export const POST = createPdfRoute({
  widgets: devopsWidgets,
  defaultTitle: "DevOps Dashboard",
});
