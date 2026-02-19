/**
 * Types for @krutai/ai-provider
 */

/**
 * Default model used when no model is specified
 */
export const DEFAULT_MODEL = 'qwen/qwen3-235b-a22b-thinking-2507' as const;

/**
 * Configuration options for KrutAIProvider
 */
export interface KrutAIProviderConfig {
    /**
     * KrutAI API key for service validation.
     * @required
     */
    apiKey: string;

    /**
     * OpenRouter API key.
     * Falls back to process.env.OPENROUTER_API_KEY if not provided.
     */
    openRouterApiKey?: string;

    /**
     * The AI model to use.
     * @default "qwen/qwen3-235b-a22b-thinking-2507"
     * @see https://openrouter.ai/models
     */
    model?: string;

    /**
     * Whether to validate the OpenRouter API key on initialization.
     * @default true
     */
    validateOnInit?: boolean;

    /**
     * Custom POST endpoint for OpenRouter API key validation.
     * Will be wired in once you deploy the route.
     */
    validationEndpoint?: string;
}

/**
 * A single chat message (OpenRouter format)
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Options for a single generate / stream call
 */
export interface GenerateOptions {
    /**
     * Override the model for this specific call.
     */
    model?: string;

    /**
     * System prompt (prepended as a system message).
     */
    system?: string;

    /**
     * Maximum tokens to generate.
     */
    maxTokens?: number;

    /**
     * Temperature (0–2).
     */
    temperature?: number;
}
