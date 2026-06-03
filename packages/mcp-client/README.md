# @krutai/mcp-client

Backend-managed MCP client connector for KrutAI.

This package lets your app connect to remote `streamable-http` MCP servers through the Krut backend. Krut owns MCP transport sessions, OAuth authorization, encrypted token storage, and streamed tool events. Your app only talks to Krut with a KrutAI API key.

Raw OAuth tokens are stored by the Krut backend and are never returned by this package.

## Features

- Connect to remote MCP servers over `streamable-http`
- Start browser-based OAuth when an MCP server requires authentication
- Reuse encrypted OAuth tokens on future calls
- List tools and call tools
- Stream long-running tool logs, progress, task updates, results, and errors
- List/read MCP resources
- List/get MCP prompts
- Send raw MCP requests for advanced methods

## Install

```bash
npm install @krutai/mcp-client
```

## Backend Requirements

The Krut backend must include the `/api/mcp` routes and have these environment variables configured:

```bash
BACKEND_URL="https://your-backend.example.com"
MCP_TOKEN_ENCRYPTION_KEY="a-long-random-secret"
```

`BACKEND_URL` is used as the OAuth redirect origin:

```txt
${BACKEND_URL}/api/mcp/oauth/callback
```

`MCP_TOKEN_ENCRYPTION_KEY` encrypts MCP OAuth access and refresh tokens. If it is not set, the backend falls back to `SESSION_SECRET`.

## Supported MCP Providers

Supported provider shortcuts are managed by the Krut backend. Fetch them at runtime so apps can show provider shortcuts without shipping hard-coded MCP server URLs.

```ts
const providers = await mcp.listSupportedProviders();

console.table(providers);
```

Default seeded provider shortcuts:

| Provider | Server URL | OAuth client setup |
| --- | --- | --- |
| Notion | `https://mcp.notion.com/mcp` | Dynamic Client Registration |
| Linear | `https://mcp.linear.app/mcp` | Dynamic Client Registration |
| Slack | `https://mcp.slack.com/mcp` | Static OAuth client config required |
| Google Calendar | `https://calendarmcp.googleapis.com/mcp/v1` | Static OAuth client config required |
| Gmail | `https://gmailmcp.googleapis.com/mcp/v1` | Static OAuth client config required |
| Bitly | `https://api-ssl.bitly.com/v4/mcp` | OAuth |
| Supabase | `https://mcp.supabase.com/mcp` | Dynamic Client Registration |
| Sentry | `https://mcp.sentry.dev/mcp` | Dynamic Client Registration |


Dynamic Client Registration providers can be connected directly with `connect()` + `startAuth()`.

## Quick Start

```ts
import { krutMcpClient } from "@krutai/mcp-client";

const mcp = krutMcpClient({
  apiKey: process.env.KRUTAI_API_KEY,
  serverUrl: "http://localhost:8000",
});

await mcp.initialize();

const connection = await mcp.connect({
  name: "Example MCP",
  serverUrl: "https://example.com/mcp",
});

const auth = await mcp.startAuth(connection.id);

if (auth.authorizationUrl) {
  console.log("Open this URL:", auth.authorizationUrl);
}

const tools = await mcp.listTools(connection.id);
console.log(tools);
```

## Create A Client

```ts
import { KrutMcpClient } from "@krutai/mcp-client";

const mcp = new KrutMcpClient({
  apiKey: process.env.KRUTAI_API_KEY,
  serverUrl: "https://api.krut.ai",
});

await mcp.initialize();
```

Or use the factory:

```ts
import { krutMcpClient } from "@krutai/mcp-client";

const mcp = krutMcpClient({
  apiKey: process.env.KRUTAI_API_KEY,
});
```

### Config

```ts
type KrutMcpClientConfig = {
  apiKey?: string;
  serverUrl?: string;
  mcpPrefix?: string;
  validateOnInit?: boolean;
  fetch?: typeof fetch;
};
```

- `apiKey`: KrutAI API key. Defaults to `process.env.KRUTAI_API_KEY`.
- `serverUrl`: Krut backend URL. Defaults to `http://localhost:8000`.
- `mcpPrefix`: Backend MCP route prefix. Defaults to `/api/mcp`.
- `validateOnInit`: Set `false` to skip API-key validation during `initialize()`.
- `fetch`: Optional custom fetch implementation for tests or special runtimes.

## Connections

Connections are user-scoped by the API key owner. Calling `connect()` with the same `serverUrl` reuses the existing connection.

```ts
const connection = await mcp.connect({
  name: "GitHub MCP",
  serverUrl: "https://github.example.com/mcp",
});

console.log(connection.id);
console.log(connection.status);
```

Connection shape:

```ts
type McpConnection = {
  id: string;
  name?: string | null;
  serverUrl: string;
  status: string;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Check current status:

```ts
const status = await mcp.getStatus(connection.id);
console.log(status.status);
```

Common statuses:

- `created`: Connection record exists but has not connected yet.
- `connected`: Last connection/auth check succeeded.
- `pending_auth`: OAuth authorization URL was generated and user action is needed.
- `auth_required`: The server requires auth but no authorization URL was available.
- `failed`: Last connection attempt failed.

## OAuth Authentication

Some MCP servers require OAuth. Use `startAuth()` after creating a connection.

```ts
const auth = await mcp.startAuth(connection.id);

if (auth.status === "connected") {
  console.log("Already connected");
}

if (auth.authorizationUrl) {
  window.location.href = auth.authorizationUrl;
}
```

In a Node CLI:

```ts
const auth = await mcp.startAuth(connection.id);

if (auth.authorizationUrl) {
  console.log("Open in your browser:");
  console.log(auth.authorizationUrl);
}
```

After the user completes auth, the MCP server redirects to the Krut backend callback. Krut verifies the OAuth `state`, exchanges the code, encrypts tokens, and marks the connection as connected.

Poll status if your UI needs to wait:

```ts
async function waitUntilConnected(connectionId: string) {
  for (;;) {
    const status = await mcp.getStatus(connectionId);
    if (status.status === "connected") return status;
    if (status.status === "failed") throw new Error(status.lastError || "MCP auth failed");
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}
```

## Tools

List tools:

```ts
const tools = await mcp.listTools(connection.id);
console.log(tools);
```

Call a tool and wait for the final result:

```ts
const result = await mcp.callTool({
  connectionId: connection.id,
  toolName: "search",
  arguments: {
    query: "latest invoices",
  },
});

console.log(result);
```

## Streaming Tool Calls

Use `streamToolCall()` for long-running jobs. It returns an async iterable of events.

```ts
const events = await mcp.streamToolCall({
  connectionId: connection.id,
  toolName: "long_running_import",
  arguments: {
    fileUrl: "https://example.com/data.csv",
  },
});

for await (const event of events) {
  switch (event.type) {
    case "started":
      console.log("Run started:", event.runId);
      break;
    case "log":
      console.log(`[${event.level}]`, event.message);
      break;
    case "progress":
      console.log("Progress:", event.percent ?? event.progress, event.message ?? "");
      break;
    case "task":
      console.log("Task update:", event.task);
      break;
    case "result":
      console.log("Result:", event.result);
      break;
    case "error":
      console.error("Error:", event.error);
      break;
    case "done":
      console.log("Done:", event.status);
      break;
  }
}
```

Stream event types:

```ts
type McpStreamEvent =
  | { type: "started"; runId: string; toolName: string }
  | { type: "log"; level: string; logger?: string; message: string; data?: unknown }
  | { type: "progress"; progress: number; total?: number; percent?: number; message?: string }
  | { type: "task"; task: unknown }
  | { type: "result"; result: unknown }
  | { type: "error"; error: string; data?: unknown }
  | { type: "done"; runId: string; status: "completed" | "failed" };
```

The backend sends newline-delimited JSON over one HTTP response. This works in modern Node runtimes and browsers that support streaming `fetch()`.

## Resources

If an MCP server exposes resources, list them:

```ts
const resources = await mcp.listResources(connection.id);
console.log(resources);
```

Read a resource:

```ts
const resource = await mcp.readResource({
  connectionId: connection.id,
  uri: "file:///docs/readme.md",
});

console.log(resource);
```

Use pagination cursor if the server returns one:

```ts
const page1 = await mcp.listResources(connection.id);
const page2 = await mcp.listResources(connection.id, "next-cursor");
```

## Prompts

If an MCP server exposes prompts, list them:

```ts
const prompts = await mcp.listPrompts(connection.id);
console.log(prompts);
```

Get a prompt with arguments:

```ts
const prompt = await mcp.getPrompt({
  connectionId: connection.id,
  name: "summarize_document",
  arguments: {
    tone: "concise",
    audience: "engineering",
  },
});

console.log(prompt);
```

Use pagination cursor if the server returns one:

```ts
const page1 = await mcp.listPrompts(connection.id);
const page2 = await mcp.listPrompts(connection.id, "next-cursor");
```

## Raw Requests

Use `rawRequest()` for MCP methods that do not yet have a convenience wrapper.

```ts
const result = await mcp.rawRequest({
  connectionId: connection.id,
  method: "tools/list",
  params: {},
});

console.log(result);
```

## Error Handling

```ts
try {
  await mcp.listTools(connection.id);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
}
```

If a server requires OAuth and the connection is not authorized, backend calls may return an auth-required error. Call `startAuth(connection.id)` and send the user to `authorizationUrl`.

For tool calls, the backend can also return an auth-required error with an authorization URL. The package preserves that response in `KrutMcpApiError`.

```ts
import { KrutMcpApiError } from "@krutai/mcp-client";

try {
  await mcp.callTool({
    connectionId: connection.id,
    toolName: "list_events",
    arguments: {},
  });
} catch (error) {
  if (error instanceof KrutMcpApiError && error.authorizationUrl) {
    window.location.href = error.authorizationUrl;
  }
}
```

## Full Example

```ts
import { krutMcpClient } from "@krutai/mcp-client";

const mcp = krutMcpClient({
  apiKey: process.env.KRUTAI_API_KEY,
  serverUrl: "http://localhost:8000",
});

await mcp.initialize();

const connection = await mcp.connect({
  name: "Example MCP",
  serverUrl: "https://example.com/mcp",
});

const auth = await mcp.startAuth(connection.id);

if (auth.authorizationUrl) {
  console.log("Authenticate here:", auth.authorizationUrl);
  process.exit(0);
}

const tools = await mcp.listTools(connection.id);
console.log("Tools:", tools);

const events = await mcp.streamToolCall({
  connectionId: connection.id,
  toolName: "process",
  arguments: {
    input: "hello",
  },
});

for await (const event of events) {
  console.log(event);
}
```

## Limitations

- v1 supports only remote `streamable-http` MCP servers.
- v1 does not support local stdio MCP servers.
- v1 does not expose MCP sampling. Tool calls can stream logs/progress, but MCP servers cannot ask Krut to run LLM sampling through this package yet.
