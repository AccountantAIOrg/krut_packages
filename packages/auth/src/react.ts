/**
 * @krutai/auth/react
 *
 * Re-exports all better-auth React client utilities.
 * Import from "@krutai/auth/react" instead of "better-auth/react".
 *
 * @example
 * ```typescript
 * import { createAuthClient } from "@krutai/auth/react";
 *
 * export const authClient = createAuthClient({
 *   baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
 * });
 *
 * export const { signIn, signUp, signOut, useSession } = authClient;
 * ```
 */
export * from 'better-auth/react';
