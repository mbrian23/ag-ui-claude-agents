import type { Spec } from "agent-core";

export interface PageWrapperOptions {
  /** Falsy text is omitted from the PDF entirely. */
  text?: string;
  /** Defaults to "Untitled". */
  title?: string;
}

/**
 * Wrap a user-supplied Spec in a Document/Page with a Heading and an
 * optional narrative paragraph. `Document`, `Page`, `Heading`, `Text`,
 * and `Spacer` are all in `standardComponents` from
 * `@json-render/react-pdf` — the renderer merges them in, so we don't
 * register them here.
 *
 * Consumers can pass their own `pageWrapper` to `createPdfRoute` if they
 * need a different layout (margins, footer, multi-column, etc.).
 */
export function defaultPageWrapper(
  userSpec: Spec,
  { text, title }: PageWrapperOptions = {}
): Spec {
  const docTitle = title ?? "Untitled";
  const elements: Record<string, unknown> = { ...userSpec.elements };
  const pageChildren: string[] = [];

  pageChildren.push("__heading");
  elements.__heading = {
    type: "Heading",
    props: { text: docTitle, level: "h1" },
    children: [],
  };

  if (text && text.trim()) {
    pageChildren.push("__text");
    elements.__text = {
      type: "Text",
      props: { text: text.trim(), fontSize: 10, color: "#334155" },
      children: [],
    };
    pageChildren.push("__spacer");
    elements.__spacer = { type: "Spacer", props: { height: 12 }, children: [] };
  }

  pageChildren.push(userSpec.root);

  elements.__page = {
    type: "Page",
    props: { size: "A4", style: { padding: 32 } },
    children: pageChildren,
  };
  elements.__doc = {
    type: "Document",
    props: { title: docTitle },
    children: ["__page"],
  };

  return { root: "__doc", elements: elements as Spec["elements"] };
}
