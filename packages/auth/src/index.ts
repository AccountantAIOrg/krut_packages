/**
 * @krutai/auth - Authentication package for KrutAI
 *
 * Requires `krutai` as a peer dependency (installed automatically).
 *
 * @example Server-side (Next.js API route / server component)
 * ```typescript
 * import { krutAuth } from "@krutai/auth";
 * import Database from "better-sqlite3";
 *
 * export const auth = krutAuth({
 *   database: new Database("./sqlite.db"),
 *   emailAndPassword: { enabled: true },
 * });
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

import { betterAuth } from 'better-auth';
import type { BetterAuthOptions } from 'better-auth';

/**
 * krutAuth — drop-in replacement for betterAuth.
 *
 * Use this instead of importing betterAuth directly.
 *
 * @example
 * ```typescript
 * import { krutAuth } from "@krutai/auth";
 * import Database from "better-sqlite3";
 *
 * export const auth = krutAuth({
 *   database: new Database("./sqlite.db"),
 *   emailAndPassword: { enabled: true },
 * });
 * ```
 */
export function krutAuth(options: BetterAuthOptions) {
    return betterAuth(options);
}

// Export main KrutAuth class (API-key-protected wrapper)
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

// Package metadata
export const VERSION = '0.1.7';
