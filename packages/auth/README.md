# @krutai/auth

Authentication package for KrutAI powered by [Better Auth](https://www.better-auth.com/).

## Features

- 🔐 **API Key Protection** — Requires a valid KrutAI API key (validated via `krutai`)
- 🚀 **Better Auth Integration** — Built on top of Better Auth
- 📦 **Auto-installs `krutai`** — The core `krutai` package is installed automatically as a peer dependency
- 🎯 **Next.js Ready** — First-class support via `@krutai/auth/next-js`
- ⚡ **Dual Format** — Supports both ESM and CommonJS
- 🔷 **TypeScript First** — Full type safety and IntelliSense

## Installation

```bash
npm install @krutai/auth
```

> **Note:** `krutai` is automatically installed as a peer dependency. `better-sqlite3` is included as a dependency and `better-auth` is bundled — no additional packages required.

## Quick Start

### Server-side setup (Next.js)

```typescript
// lib/auth.ts
import { betterAuth } from "@krutai/auth";

export const auth = betterAuth({
  database: {
    // your database config
  },
});
```

### API Route handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "@krutai/auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Client-side (React / Next.js)

```typescript
// lib/auth-client.ts
import { createAuthClient } from "@krutai/auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### With API Key Validation

```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: "your-krutai-api-key",
  betterAuthOptions: {
    database: { /* your database config */ },
  },
});

await auth.initialize();
```

## Exports

| Import path | What it provides |
|---|---|
| `@krutai/auth` | `betterAuth`, `KrutAuth`, validator re-exports from `krutai` |
| `@krutai/auth/react` | `createAuthClient`, `useSession`, etc. |
| `@krutai/auth/next-js` | `toNextJsHandler` |

## API Reference

### `KrutAuth`

#### Constructor options

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | ✅ | Your KrutAI API key |
| `betterAuthOptions` | `object` | — | Better Auth configuration |
| `validateOnInit` | `boolean` | — | Validate API key on init (default: `true`) |
| `validationEndpoint` | `string` | — | Custom validation endpoint |

#### Methods

- `initialize()` — Validates API key and sets up Better Auth
- `getBetterAuth()` — Returns the underlying Better Auth instance
- `isInitialized()` — Returns `boolean`
- `getApiKey()` — Returns the API key string

## Error Handling

```typescript
import { KrutAuth, ApiKeyValidationError } from "@krutai/auth";

try {
  const auth = new KrutAuth({ apiKey: "invalid" });
  await auth.initialize();
} catch (error) {
  if (error instanceof ApiKeyValidationError) {
    console.error("API key validation failed:", error.message);
  }
}
```

> `ApiKeyValidationError` is re-exported from `krutai` — the single source of truth for API validation across the KrutAI ecosystem.

## Architecture

`@krutai/auth` depends on `krutai` (auto-installed as a peer dependency) for API key validation. `better-auth` is bundled into the output and `better-sqlite3` is auto-installed as a dependency.

```
@krutai/auth@0.1.4
├── peerDependency: krutai >=0.1.2   (auto-installed)
├── dependency:    better-sqlite3
└── bundled:       better-auth
```

For Better Auth documentation, visit: https://www.better-auth.com/docs

## License

MIT
