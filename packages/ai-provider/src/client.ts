import type { KrutAIProviderConfig, GenerateOptions, ChatMessage } from './types';
import { DEFAULT_MODEL, DEFAULT_SERVER_URL } from './types';
import {
    validateApiKeyWithService as validateApiKey,
    validateApiKeyFormat,
    ApiKeyValidationError as KrutAIKeyValidationError,
} from 'krutai';

export { KrutAIKeyValidationError };

/**
 * KrutAIProvider — fetch-based AI provider for KrutAI
 *
 * Calls your deployed LangChain backend server for all AI operations.
 * The API key is validated against the server before use.
 *
 * @example
 * ```typescript
 * import { KrutAIProvider } from '@krutai/ai-provider';
 *
 * // Using local dev server (http://localhost:8000 by default)
 * const ai = new KrutAIProvider({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 * });
 *
 * // Or point to a production server
 * const aiProd = new KrutAIProvider({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://ai.krut.ai',
 * });
 *
 * await ai.initialize(); // validates key against server
 *
 * const text = await ai.generate('Tell me a joke');
 * console.log(text);
 * ```
 */
export class KrutAIProvider {
    private readonly apiKey: string;
    private readonly serverUrl: string;
    private readonly resolvedModel: string;
    private readonly config: KrutAIProviderConfig;

    private initialized = false;

    constructor(config: KrutAIProviderConfig) {
        this.config = config;
        this.apiKey = config.apiKey || process.env.KRUTAI_API_KEY || '';
        this.serverUrl = (config.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, ''); // strip trailing slash
        this.resolvedModel = config.model ?? DEFAULT_MODEL;

        // Basic format check immediately on construction
        validateApiKeyFormat(this.apiKey);

        // If validation is disabled, mark as ready immediately
        if (config.validateOnInit === false) {
            this.initialized = true;
        }
    }

    /**
     * Initialize the provider.
     * Validates the API key against the LangChain server, then marks provider as ready.
     *
     * @throws {KrutAIKeyValidationError} if the key is rejected or the server is unreachable
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.config.validateOnInit !== false) {
            await validateApiKey(this.apiKey, this.serverUrl);
        }

        this.initialized = true;
    }

    /**
     * Returns the currently configured default model.
     */
    getModel(): string {
        return this.resolvedModel;
    }

    /**
     * Returns whether the provider has been initialized.
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private assertInitialized(): void {
        if (!this.initialized) {
            throw new Error(
                'KrutAIProvider not initialized. Call initialize() first or set validateOnInit to false.'
            );
        }
    }

    /** Common request headers sent to the server on every AI call. */
    private authHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'x-api-key': this.apiKey,
        };
    }

    // ---------------------------------------------------------------------------
    // Public AI Methods
    // ---------------------------------------------------------------------------

    /**
     * Generate a response for a prompt (non-streaming).
     *
     * Calls: POST {serverUrl}/generate
     * Body:  { prompt, model, system?, maxTokens?, temperature? }
     * Expected response: { text: string } or { content: string } or { message: string }
     *
     * @param prompt - The user prompt string
     * @param options - Optional overrides (model, system, maxTokens, temperature)
     * @returns The assistant's response text
     */
    async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
        this.assertInitialized();
        const model = options.model ?? this.resolvedModel;

        const response = await fetch(`${this.serverUrl}/generate`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({
                prompt,
                model,
                ...(options.system !== undefined ? { system: options.system } : {}),
                ...(options.images !== undefined ? { images: options.images } : {}),
                ...(options.documents !== undefined ? { documents: options.documents } : {}),
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            }),
        });

        if (!response.ok) {
            let errorMessage = `AI server returned HTTP ${response.status} for /generate`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        const data = (await response.json()) as {
            text?: string;
            content?: string;
            message?: string;
        };

        return data.text ?? data.content ?? data.message ?? '';
    }

    /**
     * Generate a streaming response for a prompt via Server-Sent Events (SSE).
     *
     * Calls: POST {serverUrl}/stream
     * Body:  { prompt, model, system?, maxTokens?, temperature? }
     * Expected response: `text/event-stream` with `data: <chunk>` lines.
     *
     * @param prompt - The user prompt string
     * @param options - Optional overrides (model, system, maxTokens, temperature)
     * @returns An async generator yielding string chunks from the server
     *
     * @example
     * ```typescript
     * const stream = ai.stream('Tell me a story');
     * for await (const chunk of stream) {
     *   process.stdout.write(chunk);
     * }
     * ```
     */
    async *stream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string> {
        this.assertInitialized();
        const model = options.model ?? this.resolvedModel;

        const response = await fetch(`${this.serverUrl}/stream`, {
            method: 'POST',
            headers: {
                ...this.authHeaders(),
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({
                prompt,
                model,
                ...(options.system !== undefined ? { system: options.system } : {}),
                ...(options.images !== undefined ? { images: options.images } : {}),
                ...(options.documents !== undefined ? { documents: options.documents } : {}),
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            }),
        });

        if (!response.ok) {
            let errorMessage = `AI server returned HTTP ${response.status} for /stream`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        if (!response.body) {
            throw new Error('AI server returned no response body for /stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                // Keep the last (potentially incomplete) line in the buffer
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const raw = line.slice(6).trim();
                        if (raw === '[DONE]') return;
                        try {
                            const parsed = JSON.parse(raw) as {
                                text?: string;
                                content?: string;
                                delta?: { content?: string };
                            };
                            const chunk =
                                parsed.text ??
                                parsed.content ??
                                parsed.delta?.content ??
                                '';
                            if (chunk) yield chunk;
                        } catch {
                            // raw string chunk (non-JSON SSE)
                            if (raw) yield raw;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Similar to stream() but returns the raw fetch Response object.
     * Useful when you want to proxy the Server-Sent Events stream directly to a frontend client
     * (e.g., returning this directly from a Next.js API route).
     *
     * @param prompt - The user prompt string
     * @param options - Optional overrides (model, system, maxTokens, temperature)
     * @returns A Promise resolving to the native fetch Response
     */
    async streamResponse(prompt: string, options: GenerateOptions = {}): Promise<Response> {
        this.assertInitialized();
        const model = options.model ?? this.resolvedModel;

        const response = await fetch(`${this.serverUrl}/stream`, {
            method: 'POST',
            headers: {
                ...this.authHeaders(),
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({
                prompt,
                model,
                ...(options.system !== undefined ? { system: options.system } : {}),
                ...(options.images !== undefined ? { images: options.images } : {}),
                ...(options.documents !== undefined ? { documents: options.documents } : {}),
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            }),
        });

        if (!response.ok) {
            let errorMessage = `AI server returned HTTP ${response.status} for /stream`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        return response;
    }

    /**
     * Multi-turn conversation streaming: pass a full message history.
     * Calls POST /stream with the full { messages } payload.
     *
     * @param messages - Full conversation history
     * @param options - Optional overrides (model, maxTokens, temperature)
     * @returns An async generator yielding string chunks from the server
     */
    async *streamChat(messages: ChatMessage[], options: GenerateOptions = {}): AsyncGenerator<string> {
        this.assertInitialized();

        if (!messages.length) {
            throw new Error('Messages array cannot be empty for streamChat');
        }

        const model = options.model ?? this.resolvedModel;

        const response = await fetch(`${this.serverUrl}/stream`, {
            method: 'POST',
            headers: {
                ...this.authHeaders(),
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({
                messages,
                model,
                ...(options.system !== undefined ? { system: options.system } : {}),
                ...(options.images !== undefined ? { images: options.images } : {}),
                ...(options.documents !== undefined ? { documents: options.documents } : {}),
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            }),
        });

        if (!response.ok) {
            let errorMessage = `AI server returned HTTP ${response.status} for /stream`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        if (!response.body) {
            throw new Error('AI server returned no response body for /stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const raw = line.slice(6).trim();
                        if (raw === '[DONE]') return;
                        try {
                            const parsed = JSON.parse(raw) as {
                                text?: string;
                                content?: string;
                                delta?: { content?: string };
                            };
                            const chunk =
                                parsed.text ??
                                parsed.content ??
                                parsed.delta?.content ??
                                '';
                            if (chunk) yield chunk;
                        } catch {
                            if (raw) yield raw;
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Similar to streamChat() but returns the raw fetch Response object.
     * Useful for proxying the Server-Sent Events stream directly to a frontend client.
     *
     * @param messages - Full conversation history
     * @param options - Optional overrides (model, maxTokens, temperature)
     * @returns A Promise resolving to the native fetch Response
     */
    async streamChatResponse(messages: ChatMessage[], options: GenerateOptions = {}): Promise<Response> {
        this.assertInitialized();

        if (!messages.length) {
            throw new Error('Messages array cannot be empty for streamChatResponse');
        }

        const model = options.model ?? this.resolvedModel;

        const response = await fetch(`${this.serverUrl}/stream`, {
            method: 'POST',
            headers: {
                ...this.authHeaders(),
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({
                messages,
                model,
                ...(options.system !== undefined ? { system: options.system } : {}),
                ...(options.images !== undefined ? { images: options.images } : {}),
                ...(options.documents !== undefined ? { documents: options.documents } : {}),
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            }),
        });

        if (!response.ok) {
            let errorMessage = `AI server returned HTTP ${response.status} for /stream`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        return response;
    }

    /**
     * Multi-turn conversation: pass a full message history.
     *
     * Calls: POST {serverUrl}/chat
     * Body:  { messages, model, maxTokens?, temperature? }
     * Expected response: { text: string } or { content: string } or { message: string }
     *
     * @param messages - Full conversation history
     * @param options - Optional overrides (model, maxTokens, temperature)
     * @returns The assistant's response text
     */
    async chat(messages: ChatMessage[], options: GenerateOptions = {}): Promise<string> {
        this.assertInitialized();
        const model = options.model ?? this.resolvedModel;

        const response = await fetch(`${this.serverUrl}/chat`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({
                messages,
                model,
                ...(options.images !== undefined ? { images: options.images } : {}),
                ...(options.documents !== undefined ? { documents: options.documents } : {}),
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            }),
        });

        if (!response.ok) {
            let errorMessage = `AI server returned HTTP ${response.status} for /chat`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        const data = (await response.json()) as {
            text?: string;
            content?: string;
            message?: string;
        };

        return data.text ?? data.content ?? data.message ?? '';
    }
}
