# @krutai/auth — AI Assistant Reference Guide

## Package Overview

- **Name**: `@krutai/auth`
- **Version**: `0.1.7`
- **Purpose**: Authentication package for KrutAI — wraps Better Auth with a `krutAuth` function and optional API key validation via `KrutAuth` class
- **Entry**: `src/index.ts` → `dist/index.{js,mjs,d.ts}`
- **Build**: `tsup` (CJS + ESM, all deps external)

## Dependency Architecture

```
@krutai/auth@0.1.7
├── dependency: krutai              ← API key validation (also peerDep)
├── dependency: better-auth         ← auth engine (external in tsup)
├── dependency: better-sqlite3      ← default SQLite adapter
└── dependency: @types/better-sqlite3
```

> **Important for AI**: Do NOT bundle `better-auth` or `krutai` inline (no `noExternal`). They are real dependencies and must stay external in tsup.

## File Structure

```
packages/auth/
├── src/
│   ├── index.ts     # Exports krutAuth function + KrutAuth class + validator re-exports
│   ├── client.ts    # KrutAuth class (API-key-protected wrapper)
│   ├── types.ts     # KrutAuthConfig, AuthSession, BetterAuthOptions
│   ├── react.ts     # re-exports better-auth/react (createAuthClient, hooks)
│   └── next-js.ts   # re-exports better-auth/next-js (toNextJsHandler)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Sub-path Exports

| Import | File | Purpose |
|---|---|---|
| `@krutai/auth` | `dist/index.js` | `krutAuth`, `KrutAuth`, validator re-exports |
| `@krutai/auth/react` | `dist/react.js` | `createAuthClient`, hooks |
| `@krutai/auth/next-js` | `dist/next-js.js` | `toNextJsHandler` |

## Main Exports

### `krutAuth(options)` ← PRIMARY API

Drop-in replacement for `betterAuth`. Users should always use this.

```typescript
import { krutAuth } from "@krutai/auth";
import Database from "better-sqlite3";

export const auth = krutAuth({
  database: new Database("./sqlite.db"),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      name: { type: "string", required: true },
    },
  },
});
```

### `KrutAuth` class ← API-KEY-PROTECTED WRAPPER

For when you need API key validation before initializing auth.

```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  betterAuthOptions: {
    database: { provider: 'postgres', url: process.env.DATABASE_URL },
    emailAndPassword: { enabled: true },
  },
});

await auth.initialize();
const betterAuthInstance = auth.getBetterAuth();
```

**Methods:**
- `initialize(): Promise<void>` — validates API key + initializes Better Auth
- `getBetterAuth(): Auth` — returns the Better Auth `Auth` instance
- `isInitialized(): boolean`
- `getApiKey(): string`

### Types

#### `KrutAuthConfig`
```typescript
interface KrutAuthConfig {
  apiKey: string;                              // REQUIRED
  betterAuthOptions?: Partial<BetterAuthOptions>;
  validateOnInit?: boolean;                    // default: true
  validationEndpoint?: string;
}
```

### Validator Re-exports (from `krutai`)

```typescript
// These are re-exported from krutai — NOT defined here
export { validateApiKeyFormat, validateApiKeyWithService, createApiKeyChecker, ApiKeyValidationError } from 'krutai';
```

## Usage Examples

### Example 1: Standard Server Setup (recommended)
```typescript
import { krutAuth } from "@krutai/auth";
import Database from "better-sqlite3";

export const auth = krutAuth({
  database: new Database("./sqlite.db"),
  emailAndPassword: { enabled: true },
});
```

### Example 2: Next.js Route Handler
```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "@krutai/auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Example 3: React Client
```typescript
import { createAuthClient } from "@krutai/auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});
export const { signIn, signUp, signOut, useSession } = authClient;
```

### Example 4: KrutAuth with API Key Validation
```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  betterAuthOptions: { emailAndPassword: { enabled: true } },
});
await auth.initialize();
```

### Example 5: Error Handling
```typescript
import { KrutAuth, ApiKeyValidationError } from "@krutai/auth";

try {
  const auth = new KrutAuth({ apiKey: "bad" });
  await auth.initialize();
} catch (e) {
  if (e instanceof ApiKeyValidationError) {
    console.error("Invalid API key:", e.message);
  }
}
```

## tsup Configuration Notes

- `better-auth` → **external** (real dependency, NOT bundled)
- `krutai` → **external** (peer dep, NOT bundled)
- `better-sqlite3` → **external** (real dependency)
- `react`, `react-dom`, `next` → external

## Important Notes

1. **Use `krutAuth` not `betterAuth`**: The public API is `krutAuth`. `betterAuth` is an internal implementation detail
2. **Validator lives in `krutai`**: Never add a local `validator.ts` — import from `krutai`
3. **No `noExternal` for `better-auth` or `krutai`**: They must stay external in tsup
4. **`getBetterAuth()` returns `Auth`**: Uses the `Auth` type from `better-auth`, not `ReturnType<typeof betterAuth>`

## Related Packages

- `krutai` — Core utilities and API validation (peer dep)
- `@krutai/rbac` — Role-Based Access Control

## Links

- Better Auth Docs: https://www.better-auth.com/docs
- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/@krutai/auth
