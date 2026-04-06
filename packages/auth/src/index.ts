/**
 * @krutai/auth — Authentication package for KrutAI
 *
 * A fetch-based wrapper that calls your deployed server's `/lib-auth` routes.
 * The user's API key is validated against the server before any auth call is made.
 *
 * @example Basic usage
 * ```typescript
 * import { krutAuth } from '@krutai/auth';
 *
 * const auth = krutAuth({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 * });
 *
 * await auth.initialize(); // validates key with server
 *
 * const { token, user } = await auth.signUpEmail({
 *   email: 'user@example.com',
 *   password: 'secret123',
 *   name: 'Alice',
 * });
 * ```
 *
 * @example Sign in
 * ```typescript
 * const auth = krutAuth({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 * });
 * await auth.initialize();
 *
 * const { token, user } = await auth.signInEmail({
 *   email: 'user@example.com',
 *   password: 'secret123',
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { KrutAuthConfig } from './types';
import { KrutAuth } from './client';

export { KrutAuth } from './client';
export { KrutAIKeyValidationError } from './client';
export {
    validateApiKey,
    validateApiKeyFormat,
} from 'krutai';
export type {
    KrutAuthConfig,
    SignUpEmailParams,
    SignInEmailParams,
    AuthSession,
    AuthSessionRecord,
    AuthUser,
    AuthResponse,
} from './types';
export { DEFAULT_SERVER_URL, DEFAULT_AUTH_PREFIX } from './types';

/**
 * krutAuth — convenience factory.
 *
 * Creates a `KrutAuth` instance configured to call your server's `/lib-auth` routes.
 *
 * @param config - Auth configuration (`apiKey` and `serverUrl` are required)
 * @returns A `KrutAuth` instance — call `.initialize()` before use
 *
 * @example
 * ```typescript
 * import { krutAuth } from '@krutai/auth';
 *
 * const auth = krutAuth({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 * });
 *
 * await auth.initialize();
 * const { token, user } = await auth.signInEmail({
 *   email: 'user@example.com',
 *   password: 'secret123',
 * });
 * ```
 */
export function krutAuth(config: KrutAuthConfig): KrutAuth {
    return new KrutAuth(config);
}

// Package metadata
export const VERSION = '0.4.0';
