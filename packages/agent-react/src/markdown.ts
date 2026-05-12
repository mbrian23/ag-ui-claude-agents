// Pure: no React, no DOM. Safe to call from a server route.
import type { Widget } from "agent-core";

interface Element {
  type: string;
  props: Record<string, unknown>;
  children?: string[];
}

interface Spec {
  root: string;
  elements: Record<string, Element>;
}

export interface Column {
  key: string;
  label: string;
}

export type Row = Record<string, string | number>;

/**
 * Build a renderer for a list of widgets. Returns a function that turns
 * an arbitrary Spec into markdown using each widget's `toMarkdown`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSpecMarkdownRenderer(widgets: readonly Widget<any>[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byName = new Map<string, Widget<any>>();
  for (const w of widgets) byName.set(w.name, w);

  function renderElement(id: string, elements: Record<string, Element>): string {
    const el = elements[id];
    if (!el) return "";
    if (el.type === "stack") {
      return (el.children ?? [])
        .map((cid) => renderElement(cid, elements))
        .filter(Boolean)
        .join("\n\n");
    }
    const widget = byName.get(el.type);
    if (widget?.toMarkdown) {
      return widget.toMarkdown(el.props as never);
    }
    return `_(unsupported widget: ${el.type})_`;
  }

  function specToMarkdown(input: unknown): string {
    if (!isSpec(input)) return "";
    return renderElement(input.root, input.elements).trim();
  }

  function messageToMarkdown(text: string, specs: readonly unknown[]): string {
    const parts: string[] = [];
    if (text.trim()) parts.push(text.trim());
    for (const s of specs) {
      const md = specToMarkdown(s);
      if (md) parts.push(md);
    }
    return parts.join("\n\n");
  }

  return { specToMarkdown, messageToMarkdown };
}

/**
 * Reusable helper for widgets whose `toMarkdown` produces a GitHub-
 * flavored table. Saves each widget from re-implementing the pipe
 * formatting.
 */
export function markdownTable(columns: readonly Column[], rows: readonly Row[]): string {
  const header = `| ${columns.map((c) => c.label).join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((r) => `| ${columns.map((c) => String(r[c.key] ?? "")).join(" | ")} |`)
    .join("\n");
  return [header, sep, body].join("\n");
}

function isSpec(v: unknown): v is Spec {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.root === "string" && obj.elements !== null && typeof obj.elements === "object";
}
