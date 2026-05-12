import { isNonEmptySpec, slugify, type Spec, type Widget } from "agent-core";
import { renderToBuffer } from "@json-render/react-pdf/render";
import { defaultPageWrapper, type PageWrapperOptions } from "./page-wrapper";
import { buildPdfRegistry } from "./registry";

const DEFAULT_MAX_BODY_BYTES = 256 * 1024;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX = 10;

interface ExportBody {
  spec?: unknown;
  text?: string;
  title?: string;
}

export type RateLimitConfig =
  | false
  | {
      windowMs?: number;
      max?: number;
      /**
       * Custom key function. Default keys on `x-forwarded-for` (first
       * entry) or `x-real-ip`, falling back to "unknown" — fine for a
       * single-tenant dev server, swap out for prod.
       */
      keyFor?: (req: Request) => string;
    };

export interface CreatePdfRouteOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  widgets: readonly Widget<any>[];
  /** Used when the caller didn't include a title in the body. */
  defaultTitle?: string;
  /** Hard cap on request body size. Defaults to 256 KB. */
  maxBodyBytes?: number;
  /** Pass `false` to disable. Default: 10 req / 60s per IP. */
  rateLimit?: RateLimitConfig;
  /** Override the default Document/Page wrapper. */
  pageWrapper?: (userSpec: Spec, opts: PageWrapperOptions) => Spec;
}

/**
 * Body: `{ spec: { root, elements }, text?, title? }`. Returns plain
 * `Response` objects so consumers can mount this in any Web-API-
 * compatible runtime (Next App Router, Hono, native fetch handler).
 */
export function createPdfRoute(
  options: CreatePdfRouteOptions
): (req: Request) => Promise<Response> {
  const {
    widgets,
    defaultTitle = "Export",
    maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
    rateLimit = {},
    pageWrapper = defaultPageWrapper,
  } = options;

  const registry = buildPdfRegistry(widgets);
  const limiter = rateLimit === false ? null : createLimiter(rateLimit);

  return async function POST(req: Request): Promise<Response> {
    if (limiter) {
      const key = limiter.keyFor(req);
      if (limiter.isLimited(key)) {
        return jsonResponse(
          { error: `Rate limit exceeded (${limiter.max} req / ${Math.round(limiter.windowMs / 1000)}s).` },
          429,
          { "Retry-After": String(Math.ceil(limiter.windowMs / 1000)) }
        );
      }
    }

    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared && declared > maxBodyBytes) {
      return jsonResponse({ error: `Request body too large (max ${maxBodyBytes} bytes).` }, 413);
    }

    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return jsonResponse({ error: "Failed to read request body." }, 400);
    }
    if (raw.length > maxBodyBytes) {
      return jsonResponse({ error: `Request body too large (max ${maxBodyBytes} bytes).` }, 413);
    }

    let body: ExportBody;
    try {
      body = JSON.parse(raw) as ExportBody;
    } catch {
      return jsonResponse({ error: "Body must be JSON." }, 400);
    }

    const userSpec = unwrapSpec(body.spec);
    if (!userSpec) {
      return jsonResponse(
        { error: "Missing or malformed `spec` (expected { root, elements })." },
        400
      );
    }

    const title = body.title ?? defaultTitle;
    const wrapped = pageWrapper(userSpec, { text: body.text, title });

    let bytes: Uint8Array;
    try {
      bytes = await renderToBuffer(wrapped, { registry });
    } catch (err) {
      return jsonResponse(
        { error: `PDF render failed: ${err instanceof Error ? err.message : String(err)}` },
        500
      );
    }

    return new Response(bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slugify(title)}.pdf"`,
      },
    });
  };
}

function unwrapSpec(raw: unknown): Spec | null {
  let spec: unknown = raw;
  if (typeof spec === "string") {
    try {
      spec = JSON.parse(spec);
    } catch {
      return null;
    }
  }
  return isNonEmptySpec(spec) ? spec : null;
}

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

interface Limiter {
  readonly windowMs: number;
  readonly max: number;
  readonly keyFor: (req: Request) => string;
  isLimited(key: string): boolean;
}

const SWEEP_INTERVAL = 256;

function createLimiter(cfg: Exclude<RateLimitConfig, false>): Limiter {
  const windowMs = cfg.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  const max = cfg.max ?? DEFAULT_RATE_LIMIT_MAX;
  const keyFor = cfg.keyFor ?? defaultKeyFor;
  const hits = new Map<string, number[]>();
  let calls = 0;

  // Without periodic sweeping, idle keys with all-expired entries would never
  // be removed since isLimited only re-saves the active key.
  function sweep(now: number): void {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  return {
    windowMs,
    max,
    keyFor,
    isLimited(key) {
      const now = Date.now();
      if (++calls % SWEEP_INTERVAL === 0) sweep(now);

      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return true;
      }
      recent.push(now);
      hits.set(key, recent);
      return false;
    },
  };
}

function defaultKeyFor(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0];
    if (first) return first.trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}
