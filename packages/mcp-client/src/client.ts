import {
    validateApiKey,
    validateApiKeyFormat,
    KrutAIKeyValidationError,
} from 'krutai';
import type {
    CreateMcpConnectionParams,
    KrutMcpClientConfig,
    McpAuthStartResponse,
    McpConnection,
    McpPromptGetParams,
    McpRawRequestParams,
    McpResourceReadParams,
    McpStreamEvent,
    McpToolCallParams,
} from './types';
import { DEFAULT_MCP_PREFIX, DEFAULT_SERVER_URL } from './types';

export { KrutAIKeyValidationError };

export class KrutMcpClient {
    private readonly apiKey: string;
    private readonly serverUrl: string;
    private readonly mcpPrefix: string;
    private readonly config: KrutMcpClientConfig;
    private readonly fetchImpl: typeof fetch;
    private initialized = false;

    constructor(config: KrutMcpClientConfig = {}) {
        this.config = config;
        this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.KRUTAI_API_KEY : '') || '';
        this.serverUrl = (config.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, '');
        this.mcpPrefix = (config.mcpPrefix ?? DEFAULT_MCP_PREFIX).replace(/\/$/, '');
        this.fetchImpl = config.fetch ?? fetch;

        validateApiKeyFormat(this.apiKey);

        if (config.validateOnInit === false) {
            this.initialized = true;
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.config.validateOnInit !== false) {
            await validateApiKey(this.apiKey, this.serverUrl);
        }

        this.initialized = true;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    async connect(params: CreateMcpConnectionParams): Promise<McpConnection> {
        return this.request<McpConnection>('POST', '/connections', params);
    }

    async startAuth(connectionId: string): Promise<McpAuthStartResponse> {
        return this.request<McpAuthStartResponse>('POST', `/connections/${encodeURIComponent(connectionId)}/auth/start`);
    }

    async getStatus(connectionId: string): Promise<McpConnection> {
        return this.request<McpConnection>('GET', `/connections/${encodeURIComponent(connectionId)}/status`);
    }

    async listTools(connectionId: string): Promise<unknown> {
        return this.request('GET', `/connections/${encodeURIComponent(connectionId)}/tools`);
    }

    async callTool(params: McpToolCallParams): Promise<unknown> {
        return this.request(
            'POST',
            `/connections/${encodeURIComponent(params.connectionId)}/tools/${encodeURIComponent(params.toolName)}/call`,
            { arguments: params.arguments ?? {} }
        );
    }

    async streamToolCall(params: McpToolCallParams): Promise<AsyncIterable<McpStreamEvent>> {
        this.assertInitialized();

        const response = await this.fetchImpl(
            this.url(`/connections/${encodeURIComponent(params.connectionId)}/tools/${encodeURIComponent(params.toolName)}/stream`),
            {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify({ arguments: params.arguments ?? {} }),
            }
        );

        if (!response.ok) {
            throw new Error(await this.errorMessage(response, `MCP stream returned HTTP ${response.status}`));
        }
        if (!response.body) {
            throw new Error('MCP stream response did not include a body');
        }

        return parseNdjsonStream<McpStreamEvent>(response.body);
    }

    async listResources(connectionId: string, cursor?: string): Promise<unknown> {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
        return this.request('GET', `/connections/${encodeURIComponent(connectionId)}/resources${query}`);
    }

    async readResource(params: McpResourceReadParams): Promise<unknown> {
        return this.request('POST', `/connections/${encodeURIComponent(params.connectionId)}/resources/read`, {
            uri: params.uri,
        });
    }

    async listPrompts(connectionId: string, cursor?: string): Promise<unknown> {
        const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
        return this.request('GET', `/connections/${encodeURIComponent(connectionId)}/prompts${query}`);
    }

    async getPrompt(params: McpPromptGetParams): Promise<unknown> {
        return this.request('POST', `/connections/${encodeURIComponent(params.connectionId)}/prompts/${encodeURIComponent(params.name)}/get`, {
            arguments: params.arguments,
        });
    }

    async rawRequest(params: McpRawRequestParams): Promise<unknown> {
        return this.request('POST', `/connections/${encodeURIComponent(params.connectionId)}/raw`, {
            method: params.method,
            params: params.params,
        });
    }

    private assertInitialized(): void {
        if (!this.initialized) {
            throw new Error('KrutMcpClient not initialized. Call initialize() first or set validateOnInit to false.');
        }
    }

    private headers(): Record<string, string> {
        return {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
        };
    }

    private url(path: string): string {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.serverUrl}${this.mcpPrefix}${cleanPath}`;
    }

    private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
        this.assertInitialized();

        const response = await this.fetchImpl(this.url(path), {
            method,
            headers: this.headers(),
            body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(await this.errorMessage(response, `MCP server returned HTTP ${response.status} for ${path}`));
        }

        return (await response.json()) as T;
    }

    private async errorMessage(response: Response, fallback: string): Promise<string> {
        try {
            const data = (await response.json()) as { error?: string; message?: string };
            return data.error || data.message || fallback;
        } catch {
            return fallback;
        }
    }
}

async function* parseNdjsonStream<T>(body: ReadableStream<Uint8Array>): AsyncIterable<T> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                yield JSON.parse(trimmed) as T;
            }
        }
    }

    buffer += decoder.decode();
    const trimmed = buffer.trim();
    if (trimmed) {
        yield JSON.parse(trimmed) as T;
    }
}
