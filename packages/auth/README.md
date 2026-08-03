# @krutai/auth

Authentication package for KrutAI — a fetch-based HTTP client that calls your server's `/api/lib-auth` routes (powered by [Better Auth](https://www.better-auth.com/) on the server side).

> **Architecture Note:** This package is a **pure HTTP client** — it has no local database or Better Auth dependency. All auth logic (including database connections) lives on your server. This package simply makes authenticated HTTP calls to your server's auth routes.

## Features

- 🔐 **API Key Protection** — Requires a valid KrutAI API key (validated via `krutai`)
- ✉️ **Verified Registration** — Activates email/password accounts with a six-digit email OTP
- 🔁 **Password Recovery** — Resets forgotten passwords with a short-lived email OTP
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
        └── POST /api/lib-auth/api/auth/sign-up/email  ──► Your Server
                                                          └── better-auth
                                                                └── PostgreSQL
```

All database operations (user storage, session management, etc.) happen on your server. This package is just a thin, type-safe HTTP wrapper.

## Quick Start

```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: "https://your-server.com",
  databaseUrl: process.env.DATABASE_URL!, // sent as x-database-url
});

await auth.initialize(); // validates API key against server

// Sign up. The account remains pending until its email OTP is verified.
const pending = await auth.signUpEmail({
  email: "user@example.com",
  password: "secret123",
  name: "Alice",
});

// Ask the user for the six-digit code sent to their email.
const { token, user } = await auth.verifyEmailOtp({
  email: "user@example.com",
  otp: "123456",
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

### Forgot password

```typescript
// This always returns { success: true }, even when the account does not exist.
await auth.requestPasswordReset({ email: "user@example.com" });

await auth.resetPasswordWithOtp({
  email: "user@example.com",
  otp: "123456",
  password: "new-secure-password",
});
```

Registration-verification and password-reset OTP requests are each limited by the backend to three requests per client IP in a rolling five-minute window. A newly requested code replaces the previous code.

## Configuration

```typescript
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: "krut_...",          // Required (or set KRUTAI_API_KEY env var)
  serverUrl: "https://...",    // Default: "http://localhost:8000"
  authPrefix: "/api/lib-auth", // Default: "/api/lib-auth"
  databaseUrl: "...",          // Optional: DB connection for better-auth
  validateOnInit: true,        // Default: true — set false to skip in tests
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.KRUTAI_API_KEY` | Your KrutAI API key |
| `serverUrl` | `string` | `http://localhost:8000` | Base URL of your server |
| `authPrefix` | `string` | `/api/lib-auth` | Path prefix for auth routes |
| `databaseUrl` | `string` | `process.env.DATABASE_URL` | Database URL sent to server |
| `validateOnInit` | `boolean` | `true` | Validate API key on `initialize()` |

## API Reference

Creates a `KrutAuth` instance.

```typescript
import { KrutAuth } from "@krutai/auth";
const auth = new KrutAuth({
  apiKey: "...",
  serverUrl: "https://...",
  databaseUrl: "...",
});
await auth.initialize();
```

### `KrutAuth` class — Methods

| Method | HTTP Call | Description |
|---|---|---|
| `initialize()` | validates API key | **Must be called before other methods** |
| `signUpEmail(params)` | `POST /api/lib-auth/api/auth/sign-up/email` | Register a new user |
| `verifyEmailOtp(params)` | `POST /api/lib-auth/api/auth/email-otp/verify-email` | Verify registration and create a session |
| `resendVerificationOtp(params)` | `POST /api/lib-auth/api/auth/email-otp/send-verification-otp` | Resend the registration OTP |
| `requestPasswordReset(params)` | `POST /api/lib-auth/api/auth/email-otp/request-password-reset` | Send a password-reset OTP |
| `resetPasswordWithOtp(params)` | `POST /api/lib-auth/api/auth/email-otp/reset-password` | Set a new password using the OTP |
| `signInEmail(params)` | `POST /api/lib-auth/api/auth/sign-in/email` | Authenticate a user |
| `getSession(token)` | `GET /api/lib-auth/api/auth/get-session` | Retrieve session info |
| `signOut(token)` | `POST /api/lib-auth/api/auth/sign-out` | Invalidate a session |
| `request(method, path, body?)` | Any | Generic helper for custom endpoints |
| `isInitialized()` | — | Returns `boolean` |

### Types

```typescript
interface SignUpEmailParams { email: string; password: string; name: string; }
interface SignInEmailParams { email: string; password: string; }
interface VerifyEmailOtpParams { email: string; otp: string; }
interface ResendVerificationOtpParams { email: string; }
interface RequestPasswordResetParams { email: string; }
interface ResetPasswordWithOtpParams { email: string; otp: string; password: string; }

interface AuthResponse  { token: string; user: AuthUser; }
interface PendingSignUpResponse { token: null; user: AuthUser; }
interface VerifyEmailOtpResponse extends AuthResponse { status: true; }
interface AuthSuccessResponse { success: boolean; }
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
| `DATABASE_URL` | optional | Sent as `x-database-url` header |

### Backend SMTP configuration

The backend sends OTP messages through a generic SMTP server. Credentials belong only on the backend and must never be exposed to client applications.

| Variable | Required | Default | Description |
|---|---:|---|---|
| `SMTP_HOST` | ✅ | — | SMTP server hostname |
| `SMTP_PORT` | optional | `587` | SMTP server port |
| `SMTP_SECURE` | optional | `true` for port `465` | Whether to use implicit TLS |
| `SMTP_USER` | ✅ | — | SMTP username |
| `SMTP_PASSWORD` | ✅ | — | SMTP password or provider app password |
| `EMAIL_FROM` | ✅ | — | Sender email address |
| `EMAIL_FROM_NAME` | optional | — | Sender display name |

## Error Handling

```typescript
import { KrutAuth, KrutAuthKeyValidationError } from "@krutai/auth";

try {
  const auth = new KrutAuth({ apiKey: "invalid-key" });
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
import { KrutAuth } from "@krutai/auth";

const auth = new KrutAuth({
  apiKey: "test-api-key",
  serverUrl: "http://localhost:8000",
  validateOnInit: false, // Skip server round-trip in tests
});
// No need to call initialize()
```

## Architecture

```
@krutai/auth@0.5.0
└── dependency: krutai   ← API key format validation (also peerDep)

Your Server
├── better-auth          ← Auth engine
└── pg / postgres        ← PostgreSQL adapter
```

For Better Auth PostgreSQL setup, see: https://www.better-auth.com/docs/adapters/postgresql

For Better Auth documentation, visit: https://www.better-auth.com/docs

## License

MIT
