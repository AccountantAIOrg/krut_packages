/**
 * @krutai/auth/next-js
 *
 * Re-exports better-auth Next.js handler utilities.
 * Import from "@krutai/auth/next-js" instead of "better-auth/next-js".
 *
 * @example
 * ```typescript
 * import { auth } from "@/lib/auth";
 * import { toNextJsHandler } from "@krutai/auth/next-js";
 *
 * export const { GET, POST } = toNextJsHandler(auth);
 * ```
 */
export * from 'better-auth/next-js';
