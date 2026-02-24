/**
 * Types for @krutai/ai-provider
 */

/**
 * Default model identifier sent to the LangChain server when no model is specified.
 * Your server can use this value to route to its own default model.
 */
export const DEFAULT_MODEL = 'default' as const;

/**
 * Default base URL for the LangChain backend server.
 * Used when no serverUrl is provided in the config.
 */
export const DEFAULT_SERVER_URL = 'http://localhost:8000' as const;

/**
 * Configuration options for KrutAIProvider
 */
export interface KrutAIProviderConfig {
    /**
     * KrutAI API key.
     * Validated against the LangChain server before use.
     * Optional: defaults to process.env.KRUTAI_API_KEY
     */
    apiKey?: string;

    /**
     * Base URL of your deployed LangChain backend server.
     * @default "http://localhost:8000"
     * @example "https://ai.krut.ai"
     */
    serverUrl?: string;

    /**
     * The AI model to use (passed to the server).
     * The server decides what to do with this value.
     * @default "default"
     */
    model?: string;

    /**
     * Whether to validate the API key against the server on initialization.
     * Set to false to skip the validation round-trip (e.g. in tests).
     * @default true
     */
    validateOnInit?: boolean;
}

/**
 * A part of a multimodal message
 */
export interface TextContentPart {
    type: 'text';
    text: string;
}

export interface ImageContentPart {
    type: 'image_url';
    image_url: {
        url: string; // Base64 data URI or HTTP(S) URL
        detail?: 'low' | 'high' | 'auto';
    };
}

export type ContentPart = TextContentPart | ImageContentPart;
export type MessageContent = string | ContentPart[];

/**
 * A single chat message
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: MessageContent;
}

/**
 * Options for a single generate / stream / chat call
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

    /**
     * Array of image URLs or base64 data URIs to include with the request.
     */
    images?: string[];

    /**
     * Array of document URLs or base64 data URIs (e.g. PDFs) to include with the request.
     */
    documents?: string[];
}
