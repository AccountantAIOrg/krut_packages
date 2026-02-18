# @krutai/auth — AI Assistant Reference Guide

## Package Overview

- **Name**: `@krutai/auth`
- **Version**: `0.1.4`
- **Purpose**: Authentication package for KrutAI — wraps Better Auth with mandatory API key validation
- **Entry**: `src/index.ts` → `dist/index.{js,mjs,d.ts}`
- **Build**: `tsup` (CJS + ESM, `better-auth` bundled, `krutai` external peer dep)

## Dependency Architecture

```
@krutai/auth@0.1.4
├── peerDependency: krutai >=0.1.2   ← auto-installed, provides API validation
├── dependency:    better-sqlite3    ← auto-installed
└── bundled:       better-auth       ← included in dist (noExternal)
```

> **Important for AI**: The validator (`validateApiKeyFormat`, `ApiKeyValidationError`, etc.) is NOT defined in this package. It is imported from `krutai` and re-exported. Do NOT add a local `validator.ts` here.

## File Structure

```
packages/auth/
├── src/
│   ├── index.ts     # Barrel export — re-exports from krutai for validator
│   ├── client.ts    # KrutAuth class
│   ├── types.ts     # KrutAuthConfig, AuthSession, BetterAuthOptions
│   ├── react.ts     # createAuthClient (better-auth/react)
│   └── next-js.ts   # toNextJsHandler (better-auth/next-js)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Sub-path Exports

| Import | File | Purpose |
|---|---|---|
| `@krutai/auth` | `dist/index.js` | Server-side: `betterAuth`, `KrutAuth`, validator re-exports |
| `@krutai/auth/react` | `dist/react.js` | Client-side: `createAuthClient`, hooks |
| `@krutai/auth/next-js` | `dist/next-js.js` | Next.js handler: `toNextJsHandler` |

## Main Exports

### Classes

#### `KrutAuth`
Main authentication client.

**Constructor:**
```typescript
new KrutAuth(config: KrutAuthConfig)
```

**Methods:**
- `initialize(): Promise<void>` — validates API key + initializes Better Auth
- `getBetterAuth()` — returns the Better Auth instance
- `isInitialized(): boolean`
- `getApiKey(): string`
- `signIn()`, `signOut()`, `getSession()` — convenience wrappers

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

#### `AuthSession`
```typescript
interface AuthSession {
  user: { id: string; email: string; name?: string; [key: string]: unknown };
  session: { id: string; expiresAt: Date; [key: string]: unknown };
}
```

### Validator Re-exports (from `krutai`)

```typescript
// These are re-exported from krutai — NOT defined here
export { validateApiKeyFormat, validateApiKeyWithService, createApiKeyChecker, ApiKeyValidationError } from 'krutai';
```

### Other Re-exports

```typescript
export { betterAuth } from 'better-auth';
```

## Usage Examples

### Example 1: Basic Server Setup
```typescript
import { betterAuth } from '@krutai/auth';

export const auth = betterAuth({
  database: { /* config */ },
});
```

### Example 2: KrutAuth with API Key
```typescript
import { KrutAuth } from '@krutai/auth';

const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  betterAuthOptions: {
    database: { provider: 'postgres', url: process.env.DATABASE_URL },
    emailAndPassword: { enabled: true },
  },
});

await auth.initialize();
const betterAuth = auth.getBetterAuth();
```

### Example 3: Skip Async Validation
```typescript
const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  validateOnInit: false,
  betterAuthOptions: { /* config */ },
});
// No need to call initialize()
const betterAuth = auth.getBetterAuth();
```

### Example 4: Error Handling
```typescript
import { KrutAuth, ApiKeyValidationError } from '@krutai/auth';

try {
  const auth = new KrutAuth({ apiKey: 'bad' });
  await auth.initialize();
} catch (e) {
  if (e instanceof ApiKeyValidationError) {
    console.error('Invalid API key:', e.message);
  }
}
```

### Example 5: Next.js Route Handler
```typescript
// app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from '@krutai/auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

### Example 6: React Client
```typescript
import { createAuthClient } from '@krutai/auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
});
export const { signIn, signUp, signOut, useSession } = authClient;
```

## tsup Configuration Notes

- `better-auth` → `noExternal` (bundled into dist)
- `krutai` → external (peer dep, NOT bundled)
- `react`, `react-dom`, `next`, `better-sqlite3` → external

## Important Notes

1. **Validator lives in `krutai`**: Never add a local `validator.ts` — import from `krutai`
2. **`krutai` must be external in tsup**: Do NOT add it to `noExternal`
3. **`krutai` in devDependencies**: Needed for local TypeScript compilation during development
4. **API key validation**: Format check is synchronous (constructor), service check is async (`initialize()`)

## Related Packages

- `krutai` — Core utilities and API validation (peer dep)
- `@krutai/rbac` — Role-Based Access Control

## Links

- Better Auth Docs: https://www.better-auth.com/docs
- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/@krutai/auth
