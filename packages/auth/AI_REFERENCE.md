# @krutai/auth — AI Assistant Reference Guide

## Package Overview

- **Name**: `@krutai/auth`
- **Version**: `0.4.4`
- **Purpose**: Fetch-based authentication client for KrutAI — calls your server's `/lib-auth` routes (powered by better-auth + PostgreSQL on the server side)
- **Entry**: `src/index.ts` → `dist/index.{js,mjs,d.ts}`
- **Build**: `tsup` (CJS + ESM, `krutai` external)

## ⚠️ Critical Architecture Note for AI

> All auth logic and database connectivity (PostgreSQL, etc.) lives on the server.
> This package is a **pure HTTP client** that calls the server's `/lib-auth` routes.

**Do NOT suggest any of the following for this package — they do not exist:**
- `@krutai/auth/react`
- `@krutai/auth/next-js`
- `createAuthClient()`
- `toNextJsHandler()`
- `getBetterAuth()`
- `betterAuthOptions` config key
- `database` config key
- Passing `new Database(...)` or `new Pool(...)` to `krutAuth()`

**Do NOT suggest SQLite (`better-sqlite3`) usage.** The server side should use PostgreSQL.

## Dependency Architecture

```
@krutai/auth@0.4.0
└── dependency: krutai              ← API key validation (also peerDep)

Your Server (separate codebase)
├── better-auth                     ← Auth engine
└── pg / postgres                   ← PostgreSQL adapter
```

## Full System Flow

```mermaid
sequenceDiagram
    participant App as Consumer App (@krutai/auth)
    participant Server as Your Server (/lib-auth)
    participant BA as better-auth (server)
    participant PG as PostgreSQL

    App->>Server: POST /lib-auth/api/auth/sign-up/email<br/>Headers: Authorization: Bearer <apiKey> + x-database-url
    Server->>Server: Validate API key
    Server->>BA: Forward to better-auth handler with DB URL
    BA->>PG: INSERT user + session
    PG-->>BA: OK
    BA-->>Server: User + session
    Server-->>App: JSON response { token, user }
```

## File Structure

```
packages/auth/
├── src/
│   ├── index.ts     # Exports krutAuth factory + KrutAuth class + types + validators
│   ├── client.ts    # KrutAuth class (fetch-based auth client)
│   └── types.ts     # KrutAuthConfig, auth params, auth response types
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Main Exports

### `KrutAuth` class ← CORE CLIENT (FACTORY)

```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,  // or set KRUTAI_API_KEY env var
  serverUrl: "https://krut.ai",          // your server URL
  databaseUrl: process.env.DATABASE_URL, // optional: DB connection
});

await auth.initialize(); // validates API key against server
```

### `KrutAuth` class ← CORE CLIENT

| Method | HTTP Call | Description |
|---|---|---|
| `initialize()` | validates API key | Must be called before other methods |
| `signUpEmail(params)` | `POST /lib-auth/api/auth/sign-up/email` | Register a new user |
| `signInEmail(params)` | `POST /lib-auth/api/auth/sign-in/email` | Authenticate a user |
| `getSession(token)` | `GET /lib-auth/api/auth/get-session` | Retrieve session info |
| `signOut(token)` | `POST /lib-auth/api/auth/sign-out` | Invalidate a session |
| `request(method, path, body?)` | Any | Generic helper for custom endpoints |
| `isInitialized()` | — | Returns `boolean` |

### Types

#### `KrutAuthConfig`
```typescript
interface KrutAuthConfig {
  apiKey?: string;          // defaults to process.env.KRUTAI_API_KEY
  serverUrl?: string;       // default: "http://localhost:8000"
  authPrefix?: string;      // default: "/lib-auth"
  databaseUrl?: string;     // default: process.env.DATABASE_URL (sent as x-database-url)
  validateOnInit?: boolean; // default: true
}
```

#### `SignUpEmailParams` / `SignInEmailParams`
```typescript
interface SignUpEmailParams { email: string; password: string; name: string; }
interface SignInEmailParams { email: string; password: string; }
```

#### `AuthResponse`
```typescript
interface AuthResponse { token: string; user: AuthUser; [key: string]: unknown; }
```

#### `AuthUser`
```typescript
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
```

#### `AuthSession`
```typescript
interface AuthSession { user: AuthUser; session: AuthSessionRecord; }
interface AuthSessionRecord { id: string; userId: string; token: string; expiresAt: string; }
```

### Validator Re-exports (from `krutai`)

```typescript
export { validateApiKeyFormat, validateApiKey } from 'krutai';
```

## Usage Examples

### Example 1: Sign Up + Sign In
```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: "https://krut.ai",
  databaseUrl: process.env.DATABASE_URL,
});
await auth.initialize();

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
console.log("Token:", result.token);
```

### Example 2: Session Management
```typescript
// Get session
const session = await auth.getSession(token);
console.log("User:", session.user.email);

// Sign out
await auth.signOut(token);
```

### Example 3: Custom Endpoint
```typescript
const data = await auth.request("POST", "/api/auth/some-custom-endpoint", {
  someParam: "value",
});
```

### Example 4: Error Handling
```typescript
import { KrutAuth, KrutAuthKeyValidationError } from "@krutai/auth";

try {
  const auth = new KrutAuth({ apiKey: "bad-key" });
  await auth.initialize();
} catch (e) {
  if (e instanceof KrutAuthKeyValidationError) {
    console.error("Invalid API key:", e.message);
  }
}
```

### Example 5: Skip validation in tests
```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: "test-key-minimum-10-chars",
  serverUrl: "http://localhost:8000",
  validateOnInit: false, // Skip server round-trip
});
// Ready to use immediately — no initialize() needed
```

## Request Headers

Every request from `KrutAuth` sends:
```
Content-Type: application/json
Authorization: Bearer <apiKey>
x-api-key: <apiKey>
x-database-url: <databaseUrl>  (only if configured)
```

`getSession` and `signOut` replace the `Authorization` header with the user's session token:
```
Authorization: Bearer <sessionToken>
```
This requires `better-auth` to have the `bearer()` plugin enabled on the server or be configured to accept tokens from headers.

## Known Limitations

1. **`getSession`/`signOut` use `Authorization: Bearer`** — The server must be configured to handle tokens in the `Authorization` header (e.g. via better-auth's `bearer()` plugin)
2. **`AuthResponse` is missing `session`** — better-auth returns `{ token, user, session }` but the type only declares `{ token, user }`. Access `session` via the `[key: string]: unknown` index signature
3. **`dist/index.d.ts` may be missing** — Run `npm run build` inside `packages/auth` if TypeScript types are not resolving

## Important Notes

1. **No local database** — All auth logic runs on your server — this package is a pure HTTP client
2. **No SQLite** — Do not use `better-sqlite3` with this package or its server. Use PostgreSQL
3. **API key in headers** — Every request sends `Authorization: Bearer <key>` and `x-api-key` headers
4. **Server prefix** — Auth routes are prefixed with `/lib-auth` by default (configurable via `authPrefix`)
5. **Call `initialize()` first** — Must validate API key before calling auth methods (unless `validateOnInit: false`)
6. **Same pattern as ai-provider** — Works identically to `KrutAIProvider` — construct, initialize, call methods

## Related Packages

- `krutai` — Core utilities and API key validation (peer dep)
- `@krutai/ai-provider` — AI provider (same fetch-based pattern)
- `@krutai/db-service` — DB config service client

## Links

- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/@krutai/auth
- Better Auth PostgreSQL docs: https://www.better-auth.com/docs/adapters/postgresql
