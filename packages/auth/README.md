# @krutai/auth

Authentication package for KrutAI powered by [Better Auth](https://www.better-auth.com/).

## Features

- 🔐 **API Key Protection** — Requires a valid KrutAI API key (validated via `krutai`)
- 🚀 **Better Auth Integration** — Built on top of Better Auth
- 📦 **Auto-installs everything** — `krutai`, `better-auth`, `better-sqlite3` install automatically
- 🎯 **Next.js Ready** — First-class support via `@krutai/auth/next-js`
- ⚡ **Dual Format** — Supports both ESM and CommonJS
- 🔷 **TypeScript First** — Full type safety and IntelliSense

## Installation

```bash
npm install @krutai/auth
```

> **Note:** `krutai`, `better-auth`, `better-sqlite3`, and `@types/better-sqlite3` are all installed automatically.

## Quick Start

### Server-side setup (Next.js)

```typescript
// lib/auth.ts
import { krutAuth } from "@krutai/auth";
import Database from "better-sqlite3";

export const auth = krutAuth({
  database: new Database("./sqlite.db"),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      name: {
        type: "string",
        required: true,
      },
    },
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

### With API Key Validation (KrutAuth class)

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
| `@krutai/auth` | `krutAuth`, `KrutAuth`, validators |
| `@krutai/auth/react` | `createAuthClient`, `useSession`, etc. |
| `@krutai/auth/next-js` | `toNextJsHandler` |

## API Reference

### `krutAuth(options)`

Drop-in replacement for `betterAuth`. Accepts the same options.

```typescript
import { krutAuth } from "@krutai/auth";

export const auth = krutAuth({ /* Better Auth options */ });
```

### `KrutAuth` class

For API-key-protected authentication.

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | ✅ | Your KrutAI API key |
| `betterAuthOptions` | `object` | — | Better Auth configuration |
| `validateOnInit` | `boolean` | — | Validate API key on init (default: `true`) |

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

## Architecture

```
@krutai/auth@0.1.7
├── dependency: krutai          ← API key validation
├── dependency: better-auth     ← auth engine
├── dependency: better-sqlite3  ← default database adapter
└── dependency: @types/better-sqlite3
```

For Better Auth documentation, visit: https://www.better-auth.com/docs

## License

MIT
