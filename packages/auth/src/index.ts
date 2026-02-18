/**
 * @krutai/auth - Authentication package for KrutAI
 *
 * Requires `krutai` as a peer dependency (installed automatically).
 *
 * @example Server-side (Next.js API route / server component)
 * ```typescript
 * import { betterAuth } from "@krutai/auth";
 *
 * export const auth = betterAuth({ ... });
 * ```
 *
 * @example Client-side (React / Next.js client component)
 * ```typescript
 * import { createAuthClient } from "@krutai/auth/react";
 *
 * export const authClient = createAuthClient({
 *   baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
 * });
 *
 * export const { signIn, signUp, signOut, useSession } = authClient;
 * ```
 *
 * @packageDocumentation
 */

// Export main client
export { KrutAuth } from './client';

// Export types
export type { KrutAuthConfig, AuthSession, BetterAuthOptions } from './types';

// Re-export validator utilities from krutai peer dependency
export {
    validateApiKeyFormat,
    validateApiKeyWithService,
    createApiKeyChecker,
    ApiKeyValidationError,
} from 'krutai';

// Re-export betterAuth for server-side usage
export { betterAuth } from 'better-auth';

// Package metadata
export const VERSION = '0.1.2';
