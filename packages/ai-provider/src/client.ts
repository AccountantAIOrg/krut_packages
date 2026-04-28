import type {
    KrutAIProviderConfig,
    GenerateOptions,
    ChatMessage,
    TTSOptions,
    TTSResponse,
} from './types';
import { DEFAULT_MODEL, DEFAULT_SERVER_URL } from './types';
import {
    validateApiKey,
    validateApiKeyFormat,
    KrutAIKeyValidationError,
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
     * Retrieves the WebSocket URL to connect to the Gemini Live API proxy.
     * Use the returned `url` to create a new WebSocket.
     *
     * @param options - Optional configuration
     */
    async getLiveConnection(options?: { instructions?: string; voice?: string }): Promise<{ url: string; instructions?: string; voice?: string }> {
        this.assertInitialized();

        // Convert server URL from http/https to ws/wss
        const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/live';

        return {
            url: wsUrl,
            instructions: options?.instructions,
            voice: options?.voice,
        };
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
                ...(options.pdf !== undefined ? { pdf: options.pdf } : {}),
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
     * Generate a response for a prompt (non-streaming).
     *
     * Calls: POST {serverUrl}/generate
     * Body:  { prompt, model, system?, maxTokens?, temperature? }
     * Expected response: { text: string } or { content: string } or { message: string }
     *
     * @param prompt - The user prompt string
     * @param options - Optional overrides (model, system, maxTokens, temperature)
     * @returns The assistant's response text (or an object if structured)
     */
    async chat<T = any>(prompt: string, options: GenerateOptions = {}): Promise<T> {
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
                ...(options.pdf !== undefined ? { pdf: options.pdf } : {}),
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
                ...(options.isStructure !== undefined ? { isStructure: options.isStructure } : {}),
                ...(options.output_structure !== undefined ? { output_structure: options.output_structure } : {}),
                ...(options.history !== undefined ? { history: options.history } : {}),
                ...(options.attachments !== undefined ? { attachments: options.attachments } : {}),
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

        const data = (await response.json()) as any;

        // If isStructure was set, return the full object.
        if (options.isStructure) {
            return data as T;
        }

        // Otherwise return text/content/message or empty string
        return (data.text ?? data.content ?? data.message ?? '') as T;
    }

    /**
     * Convert text to speech using Gemini TTS.
     *
     * Calls: POST {serverUrl}/tts
     * Body: { text, voice?, prompt?, encoding?, languageCode?, speakingRate?, pitch?, volumeGainDb? }
     * Expected response: { audioContent: string, audioMimeType: string }
     *
     * @param text - The text to convert to speech
     * @param options - Optional TTS configuration
     * @returns Base64-encoded audio content and MIME type
     */
    async tts(text: string, options: TTSOptions = {}): Promise<TTSResponse> {
        this.assertInitialized();

        if (!text) {
            throw new Error('Text is required for TTS');
        }

        const response = await fetch(`${this.serverUrl}/tts`, {
            method: 'POST',
            headers: this.authHeaders(),
            body: JSON.stringify({
                text,
                voice: options.voice,
                prompt: options.prompt,
                encoding: options.encoding,
                languageCode: options.languageCode,
                speakingRate: options.speakingRate,
                pitch: options.pitch,
                volumeGainDb: options.volumeGainDb,
            }),
        });

        if (!response.ok) {
            let errorMessage = `AI server returned HTTP ${response.status} for /tts`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        const data = (await response.json()) as TTSResponse;
        return data;
    }
}
