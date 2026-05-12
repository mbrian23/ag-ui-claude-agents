"use client";
import { HttpAgent } from "@ag-ui/client";
import type { Message, Tool } from "@ag-ui/core";
import { combineSpecs, slugify, type Widget } from "agent-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { createSpecMarkdownRenderer } from "./markdown";
import { buildWebRegistry } from "./registry";
import { EXPORT_PDF_TOOL_NAME, RENDER_WIDGET_TOOL_NAME } from "./tool-names";
import { WidgetSurface } from "./widget-surface";

type PdfStatus = "preparing" | "ready" | "error";

interface WidgetCall {
  toolCallId: string;
  spec: unknown;
  done: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  widgets: WidgetCall[];
  pdfStatus?: PdfStatus;
  pdfTitle?: string;
}

interface PersistedSession {
  threadId: string;
  messages: ChatMessage[];
  agentMessages: Message[];
}

interface PdfActions {
  defaultTitle: string;
  download: (args: { specs: unknown[]; text: string; title: string }) => Promise<void>;
}

const DEFAULT_MAX_ITERATIONS = 5;
const DEFAULT_PDF_ROUTE = "/api/export/pdf";

const PDF_RULE =
  "When the user asks for a PDF / report / export, call `export_pdf({ title })` AFTER one or more `render_widget` calls in the same turn.";

const RENDER_WIDGET_DESCRIPTION =
  "Render dashboard widgets inline in the chat. Pass a json-render spec with a flat element tree: { root, elements }. Use a `stack` root when emitting more than one widget.";
const EXPORT_PDF_DESCRIPTION =
  "Export the dashboard widgets just rendered in this turn as a downloadable PDF. Call AFTER one or more `render_widget` calls when the user asks for a PDF, report, or export.";

const PDF_BADGE_CLASS: Record<PdfStatus, string> = {
  preparing: "rounded bg-slate-100 px-2 py-1 text-slate-700",
  ready: "rounded bg-emerald-100 px-2 py-1 text-emerald-700",
  error: "rounded bg-rose-100 px-2 py-1 text-rose-700",
};

export interface ChatShellProps {
  /** Full URL to the AG-UI server route, e.g. http://localhost:8020/devops. */
  agentUrl: string;
  /** Must match the agentId on the server. */
  agentId: string;
  /** Widgets the agent is allowed to emit. The Stack slot is added automatically. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgets: readonly Widget<any>[];
  /** Header title. Default: "Assistant". */
  title?: string;
  /** Header subtitle / one-liner. */
  subtitle?: string;
  /** Empty-state placeholder prompts. */
  placeholderHints?: readonly string[];
  /** localStorage key for the persisted thread. Default: "agent-react.session.v1". */
  storageKey?: string;
  /** Default title for the agent-driven and manual PDF exports. Default: "Export". */
  pdfDefaultTitle?: string;
  /**
   * Where the PDF route lives. Pass `false` to disable PDF entirely
   * (drops the export_pdf tool, the catalog rule, and the Export PDF
   * button). Default: "/api/export/pdf".
   */
  pdfRoute?: string | false;
  /** Extra catalog rules appended to the per-turn context prompt. */
  catalogRules?: readonly string[];
  /** Cap on agent <-> client roundtrips per user prompt. Default: 5. */
  maxIterations?: number;
}

function newId(): string {
  return crypto.randomUUID();
}

function loadSession(storageKey: string): PersistedSession {
  if (typeof window === "undefined") {
    return { threadId: newId(), messages: [], agentMessages: [] };
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { threadId: newId(), messages: [], agentMessages: [] };
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (!parsed.threadId) return { threadId: newId(), messages: [], agentMessages: [] };
    return {
      threadId: parsed.threadId,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      agentMessages: Array.isArray(parsed.agentMessages) ? parsed.agentMessages : [],
    };
  } catch {
    return { threadId: newId(), messages: [], agentMessages: [] };
  }
}

function saveSession(storageKey: string, session: PersistedSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // Quota exceeded or storage disabled — silently drop persistence.
  }
}

function clearSession(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

function buildAgent(agentUrl: string, agentId: string, threadId: string, prior: Message[]): HttpAgent {
  const agent = new HttpAgent({ url: agentUrl, agentId, threadId });
  if (prior.length) agent.addMessages(prior);
  return agent;
}

export function ChatShell({
  agentUrl,
  agentId,
  widgets,
  title = "Assistant",
  subtitle,
  placeholderHints,
  storageKey = "agent-react.session.v1",
  pdfDefaultTitle = "Export",
  pdfRoute = DEFAULT_PDF_ROUTE,
  catalogRules = [],
  maxIterations = DEFAULT_MAX_ITERATIONS,
}: ChatShellProps) {
  const pdfUrl = pdfRoute === false ? null : pdfRoute;

  const { registry, componentNames, knownTypes, catalogPromptBlock } = useMemo(
    () => buildWebRegistry(widgets),
    [widgets]
  );
  const { messageToMarkdown } = useMemo(
    () => createSpecMarkdownRenderer(widgets),
    [widgets]
  );

  const renderWidgetTool = useMemo<Tool>(
    () => ({
      name: RENDER_WIDGET_TOOL_NAME,
      description: RENDER_WIDGET_DESCRIPTION,
      parameters: {
        type: "object",
        properties: {
          spec: {
            type: "object",
            description:
              "json-render spec. `root` is the entry element id; `elements` maps id -> { type, props, children: [] }. " +
              `Component types: ${componentNames.join(", ")}.`,
            properties: {
              root: { type: "string" },
              elements: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: [...componentNames] },
                    props: { type: "object" },
                    children: { type: "array", items: { type: "string" } },
                  },
                  required: ["type", "props", "children"],
                },
              },
            },
            required: ["root", "elements"],
          },
        },
        required: ["spec"],
      },
    }),
    [componentNames]
  );

  const exportPdfTool = useMemo<Tool>(
    () => ({
      name: EXPORT_PDF_TOOL_NAME,
      description: EXPORT_PDF_DESCRIPTION,
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: `Short document title for the PDF header (e.g. '${pdfDefaultTitle}'). Optional.`,
          },
        },
        required: [],
      },
    }),
    [pdfDefaultTitle]
  );

  const promptBlock = useMemo(
    () => catalogPromptBlock(pdfUrl ? [...catalogRules, PDF_RULE] : catalogRules),
    [catalogPromptBlock, catalogRules, pdfUrl]
  );

  const tools = useMemo<Tool[]>(
    () => (pdfUrl ? [renderWidgetTool, exportPdfTool] : [renderWidgetTool]),
    [pdfUrl, renderWidgetTool, exportPdfTool]
  );

  const agentRef = useRef<HttpAgent | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const startSession = useCallback(
    (id: string, priorMessages: ChatMessage[], priorAgentMessages: Message[]) => {
      setThreadId(id);
      setMessages(priorMessages);
      setError(null);
      setLastPrompt(null);
      agentRef.current = buildAgent(agentUrl, agentId, id, priorAgentMessages);
    },
    [agentUrl, agentId]
  );

  useEffect(() => {
    const session = loadSession(storageKey);
    startSession(session.threadId, session.messages, session.agentMessages);
    setHydrated(true);
  }, [storageKey, startSession]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Persist only when idle: streaming a token would otherwise serialize the
  // entire history to JSON for every chunk.
  useEffect(() => {
    if (!hydrated || !threadId || running) return;
    saveSession(storageKey, {
      threadId,
      messages,
      agentMessages: agentRef.current?.messages ?? [],
    });
  }, [running, messages, threadId, hydrated, storageKey]);

  const updateAssistant = useCallback(
    (assistantId: string, mut: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        let changed = false;
        const next = prev.map((m) => {
          if (m.id !== assistantId) return m;
          const updated = mut(m);
          if (updated !== m) changed = true;
          return updated;
        });
        return changed ? next : prev;
      });
    },
    []
  );

  const downloadPdf = useCallback(
    async ({ specs, text, title: pdfTitle }: { specs: unknown[]; text: string; title: string }) => {
      if (!pdfUrl) throw new Error("PDF export disabled");
      const spec = specs.length === 1 ? specs[0] : combineSpecs(specs);
      const res = await fetch(pdfUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, text, title: pdfTitle }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(pdfTitle)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    [pdfUrl]
  );

  const pdf = useMemo<PdfActions | null>(
    () => (pdfUrl ? { defaultTitle: pdfDefaultTitle, download: downloadPdf } : null),
    [pdfUrl, pdfDefaultTitle, downloadPdf]
  );

  const runConversation = useCallback(
    async (prompt: string) => {
      if (!agentRef.current) return;
      const agent = agentRef.current;

      const userMsg: ChatMessage = { id: newId(), role: "user", text: prompt, widgets: [] };
      const assistantId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        widgets: [],
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setDraft("");
      setLastPrompt(prompt);
      setRunning(true);
      setError(null);

      agent.messages.push({ id: userMsg.id, role: "user", content: prompt });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Local working set so the export_pdf handler doesn't have to reach
      // into stale state to find the widgets just rendered.
      let activeText = "";
      const activeWidgets: WidgetCall[] = [];

      try {
        for (let iter = 0; iter < maxIterations; iter++) {
          if (controller.signal.aborted) break;
          const frontendCalls: Array<{ toolCallId: string; result: string }> = [];

          await agent.runAgent(
            {
              tools,
              context: [
                {
                  description: "Available widget catalog (json-render)",
                  value: promptBlock,
                },
              ],
              abortController: controller,
            },
            {
              onTextMessageContentEvent: ({ textMessageBuffer }) => {
                activeText = textMessageBuffer;
                updateAssistant(assistantId, (m) =>
                  m.text === textMessageBuffer ? m : { ...m, text: textMessageBuffer }
                );
              },
              onToolCallStartEvent: ({ event }) => {
                if (event.toolCallName !== RENDER_WIDGET_TOOL_NAME) return;
                const entry: WidgetCall = {
                  toolCallId: event.toolCallId,
                  spec: undefined,
                  done: false,
                };
                activeWidgets.push(entry);
                updateAssistant(assistantId, (m) => ({
                  ...m,
                  widgets: [...m.widgets, entry],
                }));
              },
              onToolCallArgsEvent: ({ event, partialToolCallArgs, toolCallName }) => {
                if (toolCallName !== RENDER_WIDGET_TOOL_NAME) return;
                const incoming = partialToolCallArgs.spec;
                if (incoming === undefined) return;
                const localEntry = activeWidgets.find(
                  (w) => w.toolCallId === event.toolCallId
                );
                if (localEntry) localEntry.spec = incoming;
                updateAssistant(assistantId, (m) => {
                  let widgetChanged = false;
                  const widgets = m.widgets.map((w) => {
                    if (w.toolCallId !== event.toolCallId) return w;
                    if (w.spec === incoming) return w;
                    widgetChanged = true;
                    return { ...w, spec: incoming };
                  });
                  return widgetChanged ? { ...m, widgets } : m;
                });
              },
              onToolCallEndEvent: ({ event, toolCallName, toolCallArgs }) => {
                if (toolCallName === RENDER_WIDGET_TOOL_NAME) {
                  const finalSpec = toolCallArgs.spec;
                  const localEntry = activeWidgets.find(
                    (w) => w.toolCallId === event.toolCallId
                  );
                  if (localEntry) {
                    if (finalSpec !== undefined) localEntry.spec = finalSpec;
                    localEntry.done = true;
                  }
                  updateAssistant(assistantId, (m) => ({
                    ...m,
                    widgets: m.widgets.map((w) =>
                      w.toolCallId === event.toolCallId
                        ? { ...w, spec: finalSpec ?? w.spec, done: true }
                        : w
                    ),
                  }));
                  frontendCalls.push({
                    toolCallId: event.toolCallId,
                    result: "Widget rendered.",
                  });
                  return;
                }
                if (toolCallName === EXPORT_PDF_TOOL_NAME && pdf) {
                  const specs = activeWidgets
                    .filter((w) => w.done && w.spec)
                    .map((w) => w.spec);
                  if (specs.length === 0) {
                    frontendCalls.push({
                      toolCallId: event.toolCallId,
                      result:
                        "No widgets were rendered before export_pdf. Render widgets first, then call export_pdf in a later turn.",
                    });
                    return;
                  }
                  const pdfTitle =
                    typeof toolCallArgs.title === "string" && toolCallArgs.title.trim()
                      ? toolCallArgs.title
                      : pdf.defaultTitle;
                  updateAssistant(assistantId, (m) => ({
                    ...m,
                    pdfStatus: "preparing",
                    pdfTitle,
                  }));
                  void pdf
                    .download({ specs, text: activeText, title: pdfTitle })
                    .then(() =>
                      updateAssistant(assistantId, (m) => ({ ...m, pdfStatus: "ready" }))
                    )
                    .catch((err) => {
                      updateAssistant(assistantId, (m) => ({ ...m, pdfStatus: "error" }));
                      setError(err instanceof Error ? err.message : String(err));
                    });
                  frontendCalls.push({
                    toolCallId: event.toolCallId,
                    result: `PDF download triggered for "${pdfTitle}".`,
                  });
                }
              },
            }
          );

          if (frontendCalls.length === 0) break;

          for (const fc of frontendCalls) {
            agent.messages.push({
              id: newId(),
              role: "tool",
              toolCallId: fc.toolCallId,
              content: fc.result,
            });
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setError("Stopped.");
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        abortControllerRef.current = null;
        setRunning(false);
      }
    },
    [tools, promptBlock, updateAssistant, maxIterations, pdf]
  );

  const send = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || running) return;
    void runConversation(trimmed);
  }, [draft, running, runConversation]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const retry = useCallback(() => {
    if (!lastPrompt || running) return;
    void runConversation(lastPrompt);
  }, [lastPrompt, running, runConversation]);

  const newConversation = useCallback(() => {
    if (running) abortControllerRef.current?.abort();
    clearSession(storageKey);
    startSession(newId(), [], []);
  }, [running, storageKey, startSession]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send]
  );

  return (
    <div className="flex h-full w-full flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={newConversation}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          New conversation
        </button>
      </header>

      <main ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && placeholderHints && placeholderHints.length > 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
              <p className="text-sm font-medium text-slate-700">Try asking:</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {placeholderHints.map((h) => (
                  <li key={h}>· {h}</li>
                ))}
              </ul>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              registry={registry}
              knownTypes={knownTypes}
              messageToMarkdown={messageToMarkdown}
              pdf={pdf}
            />
          ))}

          {error && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
              <span>{error}</span>
              {lastPrompt && !running && (
                <button
                  type="button"
                  onClick={retry}
                  className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question…"
            rows={1}
            disabled={running}
            className="flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100"
          />
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={draft.trim().length === 0}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Send
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  registry: import("@json-render/react").DefineRegistryResult["registry"];
  knownTypes: ReadonlySet<string>;
  messageToMarkdown: (text: string, specs: readonly unknown[]) => string;
  pdf: PdfActions | null;
}

function MessageBubble({ message, registry, knownTypes, messageToMarkdown, pdf }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const doneWidgets = message.widgets.filter((w) => w.done && w.spec).map((w) => w.spec);
  const hasContent = message.text.trim().length > 0 || doneWidgets.length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser ? "bg-indigo-600 text-white" : "bg-white text-slate-900"
        }`}
      >
        {message.text && (
          isUser ? (
            <div className="whitespace-pre-wrap">{message.text}</div>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-900 prose-p:my-1 prose-pre:my-2 prose-headings:my-2">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          )
        )}
        {!isUser &&
          message.widgets.map((w) =>
            w.done && w.spec ? (
              <WidgetSurface
                key={w.toolCallId}
                spec={w.spec}
                registry={registry}
                knownTypes={knownTypes}
              />
            ) : (
              <div
                key={w.toolCallId}
                className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-500"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                Building widget…
              </div>
            )
          )}
        {!isUser && !message.text && message.widgets.length === 0 && (
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-slate-300" />
        )}
        {!isUser && hasContent && (
          <MessageActions
            text={message.text}
            specs={doneWidgets}
            messageToMarkdown={messageToMarkdown}
            pdf={pdf}
            pdfStatus={message.pdfStatus}
            pdfTitle={message.pdfTitle}
          />
        )}
      </div>
    </div>
  );
}

interface MessageActionsProps {
  text: string;
  specs: unknown[];
  messageToMarkdown: (text: string, specs: readonly unknown[]) => string;
  pdf: PdfActions | null;
  pdfStatus?: PdfStatus;
  pdfTitle?: string;
}

function pdfStatusLabel(status: PdfStatus, title: string | undefined): string {
  if (status === "preparing") return `Preparing PDF${title ? ` · ${title}` : ""}…`;
  if (status === "ready") return `PDF ready · ${title ?? "downloaded"}`;
  return "PDF failed";
}

function MessageActions({ text, specs, messageToMarkdown, pdf, pdfStatus, pdfTitle }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const onCopy = useCallback(async () => {
    const md = messageToMarkdown(text, specs);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setExportError("Clipboard write blocked.");
    }
  }, [text, specs, messageToMarkdown]);

  const onExport = useCallback(async () => {
    if (!pdf) return;
    if (specs.length === 0) {
      setExportError("Nothing to export.");
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      await pdf.download({ specs, text, title: pdf.defaultTitle });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  }, [specs, text, pdf]);

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
      <button
        type="button"
        onClick={onCopy}
        className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50"
      >
        {copied ? "Copied" : "Copy as markdown"}
      </button>
      {pdf && (
        <button
          type="button"
          onClick={onExport}
          disabled={exporting || specs.length === 0}
          className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? "Generating PDF…" : "Export PDF"}
        </button>
      )}
      {pdfStatus && (
        <span className={PDF_BADGE_CLASS[pdfStatus]}>{pdfStatusLabel(pdfStatus, pdfTitle)}</span>
      )}
      {exportError && <span className="text-rose-600">{exportError}</span>}
    </div>
  );
}
