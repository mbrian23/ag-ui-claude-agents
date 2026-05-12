<!-- source: https://json-render.dev/docs/api/mcp -->
# @json-render/mcp

MCP Apps integration for json-render. This package enables serving json-render UIs as interactive MCP Apps inside Claude, ChatGPT, Cursor, VS Code, and other MCP-capable clients.

## Install

```
npm install @json-render/mcp @json-render/core @modelcontextprotocol/sdk
```

For React UI in the iframe, also install:

```
npm install @json-render/react react react-dom
```

See the [MCP example](https://github.com/vercel-labs/json-render/tree/main/examples/mcp) for a complete working example.

## Overview

MCP Apps allow servers to return interactive HTML UIs that render directly in chat conversations. This package bridges json-render catalogs with the MCP Apps protocol through three components:

1. Your catalog defines available components and actions for the AI
2. The MCP server exposes the catalog as a tool with the spec schema
3. The bundled HTML renders json-render specs inside the host's sandboxed iframe
4. The AI generates a spec, the host renders it, and users interact with the UI

## Server API

### createMcpApp

Creates a fully-configured MCP server as the main entry point:

```
import { createMcpApp } from "@json-render/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs";

const server = createMcpApp({
  name: "My Dashboard",
  version: "1.0.0",
  catalog: myCatalog,
  html: fs.readFileSync("dist/index.html", "utf-8"),
});

await server.connect(new StdioServerTransport());
```

**CreateMcpAppOptions:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Server name shown in client UIs |
| `version` | string | Server version |
| `catalog` | Catalog | json-render catalog defining available components |
| `html` | string | Self-contained HTML for the iframe UI |
| `tool` | McpToolOptions | Optional tool name/title/description overrides |

### registerJsonRenderTool

Register a json-render tool on an existing McpServer for servers with other tools:

```
import { registerJsonRenderTool } from "@json-render/mcp";

registerJsonRenderTool(server, {
  catalog,
  name: "render-ui",
  title: "Render UI",
  description: "Render an interactive UI",
  resourceUri: "ui://render-ui/view.html",
});
```

### registerJsonRenderResource

Register the UI resource that serves the bundled HTML:

```
import { registerJsonRenderResource } from "@json-render/mcp";

registerJsonRenderResource(server, {
  resourceUri: "ui://render-ui/view.html",
  html: bundledHtml,
});
```

## Client API (`@json-render/mcp/app`)

These exports run inside the sandboxed iframe rendered by the MCP host.

### useJsonRenderApp

React hook that connects to the MCP host, listens for tool results, and maintains the current json-render spec:

```
import { useJsonRenderApp } from "@json-render/mcp/app";
import { JSONUIProvider, Renderer } from "@json-render/react";

function McpAppView({ registry }) {
  const { spec, loading, connected, error } = useJsonRenderApp({
    name: "my-app",
    version: "1.0.0",
  });

  if (error) return <div>Error: {error.message}</div>;
  if (!spec) return <div>Waiting...</div>;

  return (
    <JSONUIProvider registry={registry} initialState={spec.state ?? {}}>
      <Renderer spec={spec} registry={registry} loading={loading} />
    </JSONUIProvider>
  );
}
```

**UseJsonRenderAppReturn:**

| Field | Type | Description |
|-------|------|-------------|
| `spec` | Spec \| null | Current json-render spec |
| `loading` | boolean | Whether the spec is still being received |
| `connected` | boolean | Whether connected to the host |
| `connecting` | boolean | Whether currently connecting |
| `error` | Error \| null | Connection error, if any |
| `app` | App \| null | The underlying MCP App instance |
| `callServerTool` | function | Call an MCP server tool and update spec from result |

### buildAppHtml

Generate a self-contained HTML page from bundled JavaScript and CSS:

```
import { buildAppHtml } from "@json-render/mcp/app";
import fs from "node:fs";

const html = buildAppHtml({
  title: "Dashboard",
  js: fs.readFileSync("dist/app.js", "utf-8"),
  css: fs.readFileSync("dist/app.css", "utf-8"),
});
```

## Client Configuration

### Cursor

Add to `.cursor/mcp.json`:

```
{
  "mcpServers": {
    "json-render": {
      "command": "npx",
      "args": ["tsx", "path/to/server.ts", "--stdio"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```
{
  "mcpServers": {
    "json-render": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/server.ts", "--stdio"]
    }
  }
}
```

## Supported Clients

MCP Apps are supported by Claude (web and desktop), ChatGPT, VS Code (GitHub Copilot), Cursor, Goose, and Postman.
