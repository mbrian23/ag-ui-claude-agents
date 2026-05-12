import type { Spec } from "@json-render/core";

export { formatSpecIssues, isNonEmptySpec, validateSpec } from "@json-render/core";
export type { Spec, SpecIssue } from "@json-render/core";

interface SpecElement {
  readonly type?: string;
  readonly props?: unknown;
  readonly children?: readonly string[];
}

/**
 * Combine multiple Specs into one rooted at a `stack` element. Each
 * source spec's element ids are namespaced (`m0_`, `m1_`, …) before
 * merging to keep them unique.
 *
 * Callers receiving untyped agent output should filter with
 * `isNonEmptySpec` first — this function used to silently skip
 * non-Spec entries, which masked typos at call sites.
 */
export function combineSpecs(specs: readonly Spec[]): Spec {
  const elements: Record<string, unknown> = {};
  const childIds: string[] = [];
  specs.forEach((spec, i) => {
    const prefix = `m${i}_`;
    Object.assign(elements, renameElements(spec.elements as Record<string, unknown>, prefix));
    childIds.push(prefix + spec.root);
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
