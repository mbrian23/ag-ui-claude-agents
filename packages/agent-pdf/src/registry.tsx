import type { Widget } from "agent-core";
import type { RenderComponentRegistry } from "@json-render/react-pdf/render";
import { View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

const STACK_GAP_PX = { sm: 8, md: 14, lg: 22 } as const;
type StackGap = keyof typeof STACK_GAP_PX;

interface StackProps {
  gap?: StackGap;
}

/**
 * Built-in `stack` slot component. Always registered so consumers don't
 * have to author one — every assistant turn that emits more than one
 * widget uses `stack` as the root.
 */
const stackPdf = ({
  element,
  children,
}: {
  element: { props?: StackProps };
  children: ReactNode;
}) => {
  const gap = STACK_GAP_PX[element.props?.gap ?? "md"];
  return (
    <View style={{ display: "flex", flexDirection: "column", gap }}>
      {children}
    </View>
  );
};

/**
 * Compose a json-render PDF component registry from the supplied widgets.
 * The `stack` built-in is auto-registered. Each widget's `renderPdf` is
 * invoked with the spec's `element.props`, casted to the widget's prop
 * type — the validateSpec call upstream already gated the shape against
 * the widget's zod schema.
 */
export function buildPdfRegistry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgets: readonly Widget<any>[]
): RenderComponentRegistry {
  const registry: RenderComponentRegistry = { stack: stackPdf };
  for (const w of widgets) {
    if (w.name === "stack") {
      throw new Error(
        "agent-pdf: widget name 'stack' is reserved for the built-in slot component."
      );
    }
    if (registry[w.name]) {
      throw new Error(`agent-pdf: duplicate widget name '${w.name}'.`);
    }
    registry[w.name] = ({ element }: { element: { props?: unknown } }) =>
      w.renderPdf(element.props as never);
  }
  return registry;
}
