"use client";
import { ChatShell as GenericChatShell } from "agent-react";
import { AGENT_ID, AGENT_URL } from "@/lib/config";
import { devopsWidgets } from "./widget-catalog";

const PLACEHOLDER_HINTS = [
  "What's our deploy frequency this month?",
  "Show deploys per service for the last 30 days.",
  "List open incidents.",
  "How is each service doing right now?",
];

export function ChatShell() {
  return (
    <GenericChatShell
      agentUrl={AGENT_URL}
      agentId={AGENT_ID}
      widgets={devopsWidgets}
      title="DevOps Dashboard"
      subtitle="Ask anything about deploys, PRs, incidents, services, or CI runs."
      placeholderHints={PLACEHOLDER_HINTS}
      storageKey="devops-dashboard.session.v1"
      pdfDefaultTitle="DevOps Dashboard"
    />
  );
}
