# @krutai/auth

Authentication package for KrutAI — a fetch-based HTTP client that calls your server's `/lib-auth` routes (powered by [Better Auth](https://www.better-auth.com/) on the server side).

> **Architecture Note:** This package is a **pure HTTP client** — it has no local database or Better Auth dependency. All auth logic (including database connections) lives on your server. This package simply makes authenticated HTTP calls to your server's auth routes.

## Features

- 🔐 **API Key Protection** — Requires a valid KrutAI API key (validated via `krutai`)
- 🚀 **Better Auth Integration** — Calls your server's Better Auth routes
- 🐘 **PostgreSQL Ready** — Your server can use any Better Auth-supported database (PostgreSQL, MySQL, etc.)
- ⚡ **Dual Format** — Supports both ESM and CommonJS
- 🔷 **TypeScript First** — Full type safety and IntelliSense
- 🌐 **Zero DB Dependencies** — No local database driver needed

## Installation

```bash
npm install @krutai/auth
```

## How It Works

```
Your App
  └── @krutai/auth (HTTP client)
        └── POST /lib-auth/api/auth/sign-up/email  ──► Your Server
                                                          └── better-auth
                                                                └── PostgreSQL
```

All database operations (user storage, session management, etc.) happen on your server. This package is just a thin, type-safe HTTP wrapper.

## Quick Start

### 1. Server-side setup (PostgreSQL + Better Auth)

Set up Better Auth on your server with a PostgreSQL database:

```typescript
// server: lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    // e.g. postgresql://user:password@localhost:5432/mydb
  }),
  emailAndPassword: {
    enabled: true,
  },
  basePath: "/lib-auth",
  baseURL: process.env.BETTER_AUTH_BASE_URL ?? "http://localhost:8000",
  secret: process.env.BETTER_AUTH_SECRET,
});
```

> **Required env vars on your server:**
> - `DATABASE_URL` — PostgreSQL connection string
> - `BETTER_AUTH_BASE_URL` — Your server's base URL (e.g. `http://localhost:8000`)
> - `BETTER_AUTH_SECRET` — Secret for signing sessions

### 2. Mount the auth handler on your server

```typescript
// server: routes/auth.ts (Express example)
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

app.use("/lib-auth", toNodeHandler(auth));
```

### 3. Use `@krutai/auth` in your client/consumer app

```typescript
import { krutAuth } from "@krutai/auth";

const auth = krutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: "https://your-server.com", // points to the server above
});

await auth.initialize(); // validates API key against server

// Sign up
const { token, user } = await auth.signUpEmail({
  email: "user@example.com",
  password: "secret123",
  name: "Alice",
});

// Sign in
const result = await auth.signInEmail({
  email: "user@example.com",
  password: "secret123",
});

// Get session
const session = await auth.getSession(result.token);

// Sign out
await auth.signOut(result.token);
```

## Configuration

```typescript
const auth = krutAuth({
  apiKey: "krut_...",          // Required (or set KRUTAI_API_KEY env var)
  serverUrl: "https://...",    // Default: "http://localhost:8000"
  authPrefix: "/lib-auth",     // Default: "/lib-auth"
  validateOnInit: true,        // Default: true — set false to skip in tests
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.KRUTAI_API_KEY` | Your KrutAI API key |
| `serverUrl` | `string` | `http://localhost:8000` | Base URL of your server |
| `authPrefix` | `string` | `/lib-auth` | Path prefix for auth routes |
| `validateOnInit` | `boolean` | `true` | Validate API key on `initialize()` |

## API Reference

### `krutAuth(config)` — Factory (recommended)

Creates a `KrutAuth` instance.

```typescript
import { krutAuth } from "@krutai/auth";
const auth = krutAuth({ apiKey: "...", serverUrl: "https://..." });
await auth.initialize();
```

### `KrutAuth` class — Methods

| Method | HTTP Call | Description |
|---|---|---|
| `initialize()` | validates API key | **Must be called before other methods** |
| `signUpEmail(params)` | `POST /lib-auth/api/auth/sign-up/email` | Register a new user |
| `signInEmail(params)` | `POST /lib-auth/api/auth/sign-in/email` | Authenticate a user |
| `getSession(token)` | `GET /lib-auth/api/auth/get-session` | Retrieve session info |
| `signOut(token)` | `POST /lib-auth/api/auth/sign-out` | Invalidate a session |
| `request(method, path, body?)` | Any | Generic helper for custom endpoints |
| `isInitialized()` | — | Returns `boolean` |

### Types

```typescript
interface SignUpEmailParams { email: string; password: string; name: string; }
interface SignInEmailParams { email: string; password: string; }

interface AuthResponse  { token: string; user: AuthUser; }
interface AuthSession   { user: AuthUser; session: AuthSessionRecord; }

interface AuthUser {
  id: string; email: string; name?: string;
  emailVerified: boolean; createdAt: string; updatedAt: string;
}
```

## Environment Variables

### Client app (where `@krutai/auth` is used)

| Variable | Required | Description |
|---|---|---|
| `KRUTAI_API_KEY` | ✅ | Your KrutAI API key |

### Server (where Better Auth + PostgreSQL runs)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_BASE_URL` | ✅ | Your server's base URL |
| `BETTER_AUTH_SECRET` | recommended | Secret for signing sessions |

## Error Handling

```typescript
import { krutAuth, KrutAuthKeyValidationError } from "@krutai/auth";

try {
  const auth = krutAuth({ apiKey: "invalid-key" });
  await auth.initialize();
} catch (e) {
  if (e instanceof KrutAuthKeyValidationError) {
    console.error("Invalid API key:", e.message);
  } else {
    console.error("Auth error:", e);
  }
}
```

## Custom Endpoints

Use the `request()` method to call any Better Auth endpoint not covered by the convenience methods:

```typescript
const data = await auth.request("POST", "/api/auth/some-custom-endpoint", {
  someParam: "value",
});
```

## Skipping Validation in Tests

```typescript
const auth = krutAuth({
  apiKey: "test-api-key",
  serverUrl: "http://localhost:8000",
  validateOnInit: false, // Skip server round-trip in tests
});
// No need to call initialize()
```

## Architecture

```
@krutai/auth@0.4.0
└── dependency: krutai   ← API key format validation (also peerDep)

Your Server
├── better-auth          ← Auth engine
└── pg / postgres        ← PostgreSQL adapter
```

For Better Auth PostgreSQL setup, see: https://www.better-auth.com/docs/adapters/postgresql

For Better Auth documentation, visit: https://www.better-auth.com/docs

## License

MIT
