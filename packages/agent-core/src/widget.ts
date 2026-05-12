import type { ReactNode } from "react";
import type { z, ZodType } from "zod";

/**
 * A renderable building block that the agent can emit via the `render_widget`
 * frontend tool. A widget owns its props schema (the agent must produce
 * matching JSON), its web rendering, and its PDF rendering. Both renderers
 * are required: PDF parity is a first-class promise of this framework, so the
 * type system rejects widgets that only ship a web view.
 */
export interface Widget<TProps = unknown> {
  readonly name: string;
  readonly description: string;
  // Untyped at the Widget level: zod v4's ZodType variance makes a generic
  // `ZodType<TProps>` reject the inferred-output schema returned by the
  // typed `defineWidget` factory. We constrain via the factory instead.
  readonly schema: ZodType;
  readonly render: (props: TProps) => ReactNode;
  readonly renderPdf: (props: TProps) => ReactNode;
  readonly toMarkdown?: (props: TProps) => string;
}

/**
 * Typed factory. Inferring `TProps` from the zod schema means `render`,
 * `renderPdf`, and `toMarkdown` all receive precisely-typed props with no
 * manual `as` casts.
 */
export function defineWidget<TSchema extends ZodType>(widget: {
  readonly name: string;
  readonly description: string;
  readonly schema: TSchema;
  readonly render: (props: z.infer<TSchema>) => ReactNode;
  readonly renderPdf: (props: z.infer<TSchema>) => ReactNode;
  readonly toMarkdown?: (props: z.infer<TSchema>) => string;
}): Widget<z.infer<TSchema>> {
  return widget;
}
