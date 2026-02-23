/**
 * @krutai/ai-provider — AI Provider package for KrutAI
 *
 * A fetch-based wrapper that calls your deployed LangChain backend server.
 * The user's API key is validated against the server before any AI call is made.
 *
 * @example Basic usage
 * ```typescript
 * import { krutAI } from '@krutai/ai-provider';
 *
 * const ai = krutAI({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 * });
 *
 * await ai.initialize(); // validates key with server
 *
 * const text = await ai.generate('Write a poem about TypeScript');
 * console.log(text);
 * ```
 *
 * @example With custom model
 * ```typescript
 * const ai = krutAI({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 *   model: 'gpt-4o',
 * });
 * await ai.initialize();
 * const text = await ai.generate('Hello!');
 * ```
 *
 * @example Streaming
 * ```typescript
 * const ai = krutAI({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 * });
 * await ai.initialize();
 *
 * const stream = ai.stream('Tell me a story');
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk);
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { KrutAIProviderConfig } from './types';
import { DEFAULT_MODEL } from './types';
import { KrutAIProvider } from './client';

export { KrutAIProvider } from './client';
export { KrutAIKeyValidationError } from './client';
export {
    validateApiKeyWithService as validateApiKey,
    validateApiKeyFormat,
} from 'krutai';
export type { KrutAIProviderConfig, GenerateOptions, ChatMessage } from './types';
export { DEFAULT_MODEL } from './types';

/**
 * krutAI — convenience factory (mirrors `krutAuth` in @krutai/auth).
 *
 * Creates a `KrutAIProvider` instance configured to call your LangChain server.
 *
 * @param config - Provider configuration (`apiKey` and `serverUrl` are required)
 * @returns A `KrutAIProvider` instance — call `.initialize()` before use
 *
 * @example
 * ```typescript
 * import { krutAI } from '@krutai/ai-provider';
 *
 * const ai = krutAI({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 * });
 *
 * await ai.initialize();
 * const text = await ai.generate('Hello!');
 * ```
 */
export function krutAI(
    config: KrutAIProviderConfig & { model?: string }
): KrutAIProvider {
    return new KrutAIProvider({
        model: DEFAULT_MODEL,
        ...config,
    });
}

// Package metadata
export const VERSION = '0.2.0';
