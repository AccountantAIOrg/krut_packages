/**
 * @krutai/ai-provider — AI Provider package for KrutAI
 *
 * A thin wrapper around `@openrouter/sdk`, mirroring the patterns from `@krutai/auth`.
 *
 * Default model: `qwen/qwen3-235b-a22b-thinking-2507`
 *
 * @example Basic usage
 * ```typescript
 * import { krutAI } from '@krutai/ai-provider';
 *
 * const ai = krutAI(); // uses OPENROUTER_API_KEY env var
 * await ai.initialize();
 *
 * const text = await ai.generate('Write a poem about TypeScript');
 * console.log(text);
 * ```
 *
 * @example With custom model
 * ```typescript
 * const ai = krutAI({ model: 'openai/gpt-4o' });
 * await ai.initialize();
 * const text = await ai.generate('Hello!');
 * ```
 *
 * @example Streaming
 * ```typescript
 * const ai = krutAI();
 * await ai.initialize();
 *
 * const stream = await ai.stream('Tell me a story');
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { KrutAIProviderConfig } from './types';
import { DEFAULT_MODEL } from './types';
import { KrutAIProvider } from './client';

export { KrutAIProvider } from './client';
export { OpenRouterKeyValidationError } from './client';
export {
    validateOpenRouterKeyFormat,
    validateOpenRouterKeyWithService,
} from './validator';
export type { KrutAIProviderConfig, GenerateOptions, ChatMessage } from './types';
export { DEFAULT_MODEL } from './types';

/**
 * krutAI — convenience factory (mirrors `krutAuth` in @krutai/auth).
 *
 * Creates a `KrutAIProvider` instance. OpenRouter API key is read from
 * `config.openRouterApiKey` or falls back to `process.env.OPENROUTER_API_KEY`.
 *
 * @param config - Provider configuration (all fields optional except apiKey)
 * @returns A `KrutAIProvider` instance (call `.initialize()` before use)
 *
 * @example
 * ```typescript
 * import { krutAI } from '@krutai/ai-provider';
 *
 * const ai = krutAI(); // env OPENROUTER_API_KEY + default model
 * await ai.initialize();
 * const text = await ai.generate('Hello!');
 * ```
 */
export function krutAI(
    config: Partial<KrutAIProviderConfig> & { apiKey?: string } = {}
): KrutAIProvider {
    return new KrutAIProvider({
        apiKey: config.apiKey ?? 'krutai-internal',
        model: config.model ?? DEFAULT_MODEL,
        ...config,
    });
}

// Package metadata
export const VERSION = '0.1.0';
