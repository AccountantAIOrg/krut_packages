/**
 * @krutai/mcp-client — backend-managed MCP client connector for KrutAI.
 *
 * Supports remote streamable-http MCP servers, OAuth authorization URLs,
 * and fetch-streamed tool logs/progress via Krut backend routes.
 *
 * @packageDocumentation
 */

import type { KrutMcpClientConfig } from './types';
import { KrutMcpClient } from './client';

export { KrutMcpClient } from './client';
export { KrutAIKeyValidationError } from './client';
export {
    validateApiKey,
    validateApiKeyFormat,
} from 'krutai';
export type {
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
export { DEFAULT_MCP_PREFIX, DEFAULT_SERVER_URL } from './types';

export function krutMcpClient(config: KrutMcpClientConfig = {}): KrutMcpClient {
    return new KrutMcpClient(config);
}

export const VERSION = '0.1.0';
