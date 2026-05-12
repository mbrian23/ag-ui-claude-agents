"use client";
import type { Widget } from "agent-core";
import { defineCatalog, type Catalog } from "@json-render/core";
import {
  type BaseComponentProps,
  defineRegistry,
  type DefineRegistryResult,
} from "@json-render/react";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

const StackPropsSchema = z.object({
  gap: z.enum(["sm", "md", "lg"]).optional(),
});
type StackProps = z.infer<typeof StackPropsSchema>;

const STACK_GAP_CLASS = { sm: "gap-2", md: "gap-4", lg: "gap-6" } as const;
const STACK_DESCRIPTION =
  "Vertical column container. Use as the root when emitting more than one widget in a single response.";

interface BuildWebRegistryResult {
  registry: DefineRegistryResult["registry"];
  componentNames: readonly string[];
  catalogPromptBlock: (extraRules?: readonly string[]) => string;
}

const DEFAULT_RULES: readonly string[] = [
  "When you need to render UI, use the `render_widget({ spec })` frontend tool. The `spec` is a json-render flat element tree (`{ root, elements }`) using ONLY the component types defined in the catalog above.",
  "Every element MUST include `type`, `props`, and `children` (use `[]` for leaves).",
  "Use `stack` as the root when emitting more than one widget in the same response.",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildWebRegistry(widgets: readonly Widget<any>[]): BuildWebRegistryResult {
  const catalogComponents: Record<string, { props: unknown; description?: string; slots?: string[] }> = {
    stack: { props: StackPropsSchema, slots: ["default"], description: STACK_DESCRIPTION },
  };
  const registryComponents: Record<string, (ctx: BaseComponentProps<never>) => React.ReactNode> = {
    stack: ({ props, children }: BaseComponentProps<StackProps>) => (
      <div className={`flex flex-col ${STACK_GAP_CLASS[props.gap ?? "md"]}`}>{children}</div>
    ),
  };

  for (const w of widgets) {
    if (w.name === "stack") {
      throw new Error("agent-react: widget name 'stack' is reserved.");
    }
    if (catalogComponents[w.name]) {
      throw new Error(`agent-react: duplicate widget name '${w.name}'.`);
    }
    catalogComponents[w.name] = { props: w.schema, description: w.description };
    registryComponents[w.name] = ({ props }: BaseComponentProps<never>) =>
      w.render(props as never);
  }

  const catalog = defineCatalog(schema, {
    components: catalogComponents as never,
    actions: {},
  } as never) as Catalog;

  const { registry } = defineRegistry(catalog, {
    components: registryComponents as never,
    actions: {},
  } as never) as DefineRegistryResult;

  const componentNames = Object.keys(catalogComponents);

  const catalogPromptBlock = (extraRules: readonly string[] = []): string =>
    catalog.prompt({ customRules: [...DEFAULT_RULES, ...extraRules] });

  return { registry, componentNames, catalogPromptBlock };
}
