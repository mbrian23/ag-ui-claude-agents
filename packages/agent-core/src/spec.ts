import type { Spec } from "@json-render/core";

export { formatSpecIssues, isNonEmptySpec, validateSpec } from "@json-render/core";
export type { Spec, SpecIssue } from "@json-render/core";

interface SpecElement {
  readonly type?: string;
  readonly props?: unknown;
  readonly children?: readonly string[];
}

export function combineSpecs(specs: readonly unknown[]): Spec {
  const elements: Record<string, unknown> = {};
  const childIds: string[] = [];
  specs.forEach((s, i) => {
    if (!s || typeof s !== "object") return;
    const obj = s as { root?: string; elements?: Record<string, unknown> };
    if (!obj.root || !obj.elements) return;
    const prefix = `m${i}_`;
    Object.assign(elements, renameElements(obj.elements, prefix));
    childIds.push(prefix + obj.root);
  });
  elements.__combined_root = {
    type: "stack",
    props: { gap: "md" },
    children: childIds,
  };
  return { root: "__combined_root", elements } as Spec;
}

function renameElements(src: Record<string, unknown>, prefix: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [id, el] of Object.entries(src)) {
    if (!el || typeof el !== "object") {
      out[prefix + id] = el;
      continue;
    }
    const e = el as SpecElement;
    out[prefix + id] = {
      ...e,
      children: (e.children ?? []).map((c) => prefix + c),
    };
  }
  return out;
}
