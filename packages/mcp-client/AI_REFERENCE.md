# @krutai/mcp-client AI Reference

- Use `KrutMcpClient` or `krutMcpClient` to call Krut backend MCP routes.
- This package does not connect directly to MCP servers. The Krut backend owns OAuth, token storage, and MCP transport sessions.
- Only remote `streamable-http` MCP servers are supported in v1.
- `startAuth(connectionId)` returns an `authorizationUrl` when user browser authentication is required.
- `streamToolCall()` returns an async iterable of NDJSON-backed events: `started`, `log`, `progress`, `task`, `result`, `error`, `done`.
- Fetch supported provider shortcuts from the backend with `listSupportedProviders()`.
- Dynamic Client Registration providers can be connected directly with `connect()` then `startAuth()`.
