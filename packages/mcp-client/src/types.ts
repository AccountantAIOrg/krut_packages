export const DEFAULT_SERVER_URL = 'http://localhost:8000' as const;
export const DEFAULT_MCP_PREFIX = '/api/mcp' as const;

export interface KrutMcpClientConfig {
    apiKey?: string;
    serverUrl?: string;
    mcpPrefix?: string;
    validateOnInit?: boolean;
    fetch?: typeof fetch;
}

export interface McpConnection {
    id: string;
    name?: string | null;
    serverUrl: string;
    status: string;
    lastError?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMcpConnectionParams {
    name?: string;
    serverUrl: string;
}

export interface McpAuthStartResponse {
    status: 'connected' | 'auth_required' | 'pending_auth' | 'failed' | string;
    authorizationUrl?: string;
}

export interface McpToolCallParams {
    connectionId: string;
    toolName: string;
    arguments?: Record<string, unknown>;
}

export interface McpResourceReadParams {
    connectionId: string;
    uri: string;
}

export interface McpPromptGetParams {
    connectionId: string;
    name: string;
    arguments?: Record<string, string>;
}

export interface McpRawRequestParams {
    connectionId: string;
    method: string;
    params?: unknown;
}

export type McpStreamEvent =
    | { type: 'started'; runId: string; toolName: string }
    | { type: 'log'; level: string; logger?: string; message: string; data?: unknown }
    | { type: 'progress'; progress: number; total?: number; percent?: number; message?: string }
    | { type: 'task'; task: unknown }
    | { type: 'result'; result: unknown }
    | { type: 'error'; error: string; data?: unknown }
    | { type: 'done'; runId: string; status: 'completed' | 'failed' };
