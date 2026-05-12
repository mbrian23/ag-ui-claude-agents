import http from "node:http";
import { EventEncoder } from "@ag-ui/encoder";
import { EventType, type RunAgentInput, type RunErrorEvent } from "@ag-ui/core";
import type { ClaudeAgentAdapter } from "@ag-ui/claude-agent-sdk";
import { createAdapterFromSkills, type CreateAdapterOptions } from "./compose";

export interface CreateAgentServerOptions extends CreateAdapterOptions {
  /** URL path for POST. Default: "agent". */
  route?: string;
  /** Default: 8020. Overridable via PORT env. */
  port?: number;
  /** Comma-separated list or `*`. Default: ["http://localhost:3000"]. */
  allowedOrigins?: readonly string[];
  /** When true, log inbound RunAgentInput summaries. Default: AG_UI_DEBUG env truthy. */
  debug?: boolean;
}

/**
 * Returned by `createAgentServer`. Note the `.listen()` contract is on
 * **you**, not the package — the constructed `http.Server` is NOT
 * listening yet. Call `handle.server.listen(handle.port, host?, cb?)`
 * to bind. This is intentional so consumers can:
 *
 * - choose the bind host (e.g. `0.0.0.0` for containers vs `127.0.0.1`)
 * - attach the bare `handler` to an existing Node `http.Server` they
 *   share with other routes
 * - attach upgrade listeners for WebSockets before binding
 * - run the handler in a serverless / fetch-style runtime via `handler`
 *
 * For the simple case, two lines:
 *
 *     const { server, port } = createAgentServer({ ... });
 *     server.listen(port);
 *
 * `createPdfRoute` from `agent-pdf` returns a callable handler instead
 * of an object because it mounts inside a framework router (Next App
 * Router) that owns the listener.
 */
export interface AgentServerHandle {
  server: http.Server;
  handler: http.RequestListener;
  adapter: ClaudeAgentAdapter;
  route: string;
  port: number;
}

export function createAgentServer(opts: CreateAgentServerOptions): AgentServerHandle {
  const route = opts.route ?? "agent";
  const port = opts.port ?? Number(process.env.PORT ?? 8020);
  const allowedOrigins = opts.allowedOrigins ?? ["http://localhost:3000"];
  const allowAll = allowedOrigins.includes("*");
  const debug = opts.debug ?? Boolean(process.env.AG_UI_DEBUG);

  const adapter = createAdapterFromSkills(opts);

  function setCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): void {
    const origin = req.headers.origin;
    if (allowAll) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  async function readBody(req: http.IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf-8");
  }

  const handler: http.RequestListener = async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname.replace(/^\//, "");

    if (req.method === "GET" && path === "health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy", route }));
      return;
    }

    if (req.method === "POST" && path === route) {
      let inputData: RunAgentInput;
      try {
        inputData = JSON.parse(await readBody(req)) as RunAgentInput;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
      if (debug) {
        console.log(
          `[agent-server] inbound: thread=${inputData.threadId} run=${inputData.runId} msgs=${inputData.messages?.length ?? 0}`
        );
      }

      const encoder = new EventEncoder({
        accept: req.headers.accept ?? "text/event-stream",
      });

      res.writeHead(200, {
        "Content-Type": encoder.getContentType(),
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      adapter.run(inputData).subscribe({
        next: (event) => {
          res.write(encoder.encode(event));
        },
        error: (err) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[agent-server] run error:", message);
          const errorEvent: RunErrorEvent = { type: EventType.RUN_ERROR, message };
          res.write(encoder.encode(errorEvent));
          res.end();
        },
        complete: () => {
          res.end();
        },
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found", routes: [`POST /${route}`, "GET /health"] }));
  };

  const server = http.createServer(handler);
  return { server, handler, adapter, route, port };
}
