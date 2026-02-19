import { OpenRouter } from '@openrouter/sdk';
import type { KrutAIProviderConfig, GenerateOptions, ChatMessage } from './types';
import { DEFAULT_MODEL } from './types';
import {
    validateOpenRouterKeyFormat,
    validateOpenRouterKeyWithService,
    OpenRouterKeyValidationError,
} from './validator';

export { OpenRouterKeyValidationError };

/**
 * KrutAIProvider — AI provider for KrutAI
 *
 * Wraps `@openrouter/sdk` and adds:
 *  - OpenRouter API key format validation
 *  - Configurable default model (defaults to qwen/qwen3-235b-a22b-thinking-2507)
 *  - Optional pluggable validation endpoint
 *
 * @example
 * ```typescript
 * import { KrutAIProvider } from '@krutai/ai-provider';
 *
 * const ai = new KrutAIProvider({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   openRouterApiKey: process.env.OPENROUTER_API_KEY!, // or set in env
 * });
 *
 * await ai.initialize();
 *
 * const text = await ai.generate('Tell me a joke');
 * console.log(text);
 * ```
 */
export class KrutAIProvider {
    private readonly resolvedOpenRouterKey: string;
    private readonly resolvedModel: string;
    private readonly config: KrutAIProviderConfig;

    private openRouterClient: OpenRouter | null = null;
    private initialized = false;

    constructor(config: KrutAIProviderConfig) {
        this.config = config;

        // Resolve OpenRouter key: explicit config → env var → hardcoded default (temporary)
        // TODO: remove hardcoded key once validation endpoint is live
        this.resolvedOpenRouterKey =
            config.openRouterApiKey ??
            process.env.OPENROUTER_API_KEY ??
            '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';

        this.resolvedModel = config.model ?? DEFAULT_MODEL;

        // Validate OpenRouter key format immediately on construction
        validateOpenRouterKeyFormat(this.resolvedOpenRouterKey);

        // Skip async validation if the user opts out
        if (config.validateOnInit === false) {
            this.setupClient();
        }
    }

    /**
     * Initialize the provider.
     * Validates the OpenRouter API key (optionally against a service endpoint)
     * and sets up the underlying OpenRouter client.
     *
     * @throws {OpenRouterKeyValidationError}
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.config.validateOnInit !== false) {
            await validateOpenRouterKeyWithService(
                this.resolvedOpenRouterKey,
                this.config.validationEndpoint
            );
        }

        this.setupClient();
        this.initialized = true;
    }

    /** @private */
    private setupClient(): void {
        this.openRouterClient = new OpenRouter({
            apiKey: this.resolvedOpenRouterKey,
        });
    }

    /**
     * Get the raw OpenRouter SDK client instance.
     * @throws {Error} If not initialized
     */
    getClient(): OpenRouter {
        if (!this.openRouterClient) {
            throw new Error(
                'KrutAIProvider not initialized. Call initialize() first or set validateOnInit to false.'
            );
        }
        return this.openRouterClient;
    }

    /**
     * Get the currently configured default model.
     */
    getModel(): string {
        return this.resolvedModel;
    }

    /**
     * Check whether the provider has been initialized.
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Generate a response for a prompt (non-streaming).
     *
     * @param prompt - The user prompt string
     * @param options - Optional overrides (model, system, maxTokens, temperature)
     * @returns The assistant's response text
     */
    async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
        const client = this.getClient();
        const model = options.model ?? this.resolvedModel;

        const messages: ChatMessage[] = [];
        if (options.system) {
            messages.push({ role: 'system', content: options.system });
        }
        messages.push({ role: 'user', content: prompt });

        const result = await client.chat.send({
            chatGenerationParams: {
                model,
                messages,
                stream: false,
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            },
        });

        // Non-streaming result: ChatResponse
        const response = result as { choices: Array<{ message: { content: string } }> };
        return response.choices?.[0]?.message?.content ?? '';
    }

    /**
     * Generate a streaming response for a prompt.
     *
     * @param prompt - The user prompt string
     * @param options - Optional overrides (model, system, maxTokens, temperature)
     * @returns An async iterable of server-sent event chunks
     *
     * @example
     * ```typescript
     * const stream = await ai.stream('Tell me a story');
     * for await (const chunk of stream) {
     *   process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
     * }
     * ```
     */
    async stream(prompt: string, options: GenerateOptions = {}) {
        const client = this.getClient();
        const model = options.model ?? this.resolvedModel;

        const messages: ChatMessage[] = [];
        if (options.system) {
            messages.push({ role: 'system', content: options.system });
        }
        messages.push({ role: 'user', content: prompt });

        return client.chat.send({
            chatGenerationParams: {
                model,
                messages,
                stream: true,
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            },
        });
    }

    /**
     * Multi-turn conversation: pass a full message history.
     *
     * @param messages - Full conversation history
     * @param options - Optional overrides (model, maxTokens, temperature)
     */
    async chat(messages: ChatMessage[], options: GenerateOptions = {}): Promise<string> {
        const client = this.getClient();
        const model = options.model ?? this.resolvedModel;

        const result = await client.chat.send({
            chatGenerationParams: {
                model,
                messages,
                stream: false,
                ...(options.maxTokens !== undefined ? { maxTokens: options.maxTokens } : {}),
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
            },
        });

        const response = result as { choices: Array<{ message: { content: string } }> };
        return response.choices?.[0]?.message?.content ?? '';
    }
}
