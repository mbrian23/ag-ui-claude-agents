/**
 * Compile-only assertions for the Widget contract. Runs as part of `tsc
 * --noEmit`. If you can omit `renderPdf` and the file still typechecks,
 * the type contract has regressed.
 *
 * The negative case is wrapped in a `// @ts-expect-error` so it's an error
 * if the omission *would* compile.
 */
import type { ReactNode } from "react";
import { z } from "zod";
import { defineWidget } from "../widget";

const fakeNode = (): ReactNode => null;

const ok = defineWidget({
  name: "k",
  description: "kpi",
  schema: z.object({ value: z.number() }),
  render: (p) => {
    void p.value;
    return fakeNode();
  },
  renderPdf: (p) => {
    void p.value;
    return fakeNode();
  },
});

void ok.name;

// @ts-expect-error — renderPdf is required.
const bad = defineWidget({
  name: "k",
  description: "kpi",
  schema: z.object({ value: z.number() }),
  render: (p) => {
    void p.value;
    return fakeNode();
  },
});

void bad;
