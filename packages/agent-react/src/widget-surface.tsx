"use client";
import { formatSpecIssues, type Spec, type SpecIssue, validateSpec } from "agent-core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { DefineRegistryResult } from "@json-render/react";
import { useMemo } from "react";

interface ValidationOutcome {
  spec: Spec | null;
  issues: SpecIssue[];
}

function validate(input: unknown, knownTypes: ReadonlySet<string>): ValidationOutcome {
  let spec: unknown = input;
  if (typeof spec === "string") {
    try {
      spec = JSON.parse(spec);
    } catch {
      return {
        spec: null,
        issues: [
          { code: "empty_spec", severity: "error", message: "Spec was a string and not valid JSON." },
        ],
      };
    }
  }
  if (!spec || typeof spec !== "object") {
    return {
      spec: null,
      issues: [{ code: "empty_spec", severity: "error", message: "Spec must be an object." }],
    };
  }

  const result = validateSpec(spec as Spec);
  const errors = result.issues.filter((i) => i.severity === "error");
  if (errors.length) return { spec: null, issues: errors };

  const elements = (spec as { elements?: Record<string, { type?: string }> }).elements ?? {};
  const unknown: SpecIssue[] = [];
  for (const [id, el] of Object.entries(elements)) {
    if (!el?.type || !knownTypes.has(el.type)) {
      unknown.push({
        code: "missing_child",
        severity: "error",
        message: `Unknown component type: ${el?.type ?? "(missing)"}`,
        elementKey: id,
      });
    }
  }
  if (unknown.length) return { spec: null, issues: unknown };
  return { spec: spec as Spec, issues: [] };
}

export interface WidgetSurfaceProps {
  spec: unknown;
  registry: DefineRegistryResult["registry"];
  knownTypes: ReadonlySet<string>;
  /** Hide the verbose error card. Useful in PDF preview surfaces. */
  silenceErrors?: boolean;
}

export function WidgetSurface({
  spec,
  registry,
  knownTypes,
  silenceErrors = false,
}: WidgetSurfaceProps) {
  const { spec: validated, issues } = useMemo(
    () => validate(spec, knownTypes),
    [spec, knownTypes]
  );

  if (!validated) {
    if (silenceErrors) return null;
    const names = [...knownTypes].join(", ");
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-mono text-xs text-amber-900">
        <div className="mb-2 font-semibold">Bad widget spec</div>
        <pre className="mb-2 whitespace-pre-wrap">{formatSpecIssues(issues)}</pre>
        <div className="mb-1">Known components: {names}</div>
        <details>
          <summary className="cursor-pointer">Received</summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="my-2">
      <JSONUIProvider registry={registry} initialState={{}}>
        <Renderer spec={validated} registry={registry} />
      </JSONUIProvider>
    </div>
  );
}
