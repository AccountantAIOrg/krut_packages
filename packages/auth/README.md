# @krutai/auth

Authentication package for KrutAI — a fetch-based HTTP client that calls your server's `/api/lib-auth` routes (powered by [Better Auth](https://www.better-auth.com/) on the server side).

> **Architecture Note:** This package has no local database or Better Auth dependency. Email/password operations call your server's auth routes. The optional server-side Google helper also creates the authorization request and exchanges Google's one-time code before sending the verified ID token to your server. User and session persistence remains on the server.

## Features

- 🔐 **API Key Protection** — Requires a valid KrutAI API key (validated via `krutai`)
- ✉️ **Verified Registration** — Activates email/password accounts with a six-digit email OTP
- 🔁 **Password Recovery** — Resets forgotten passwords with a short-lived email OTP
- 🔵 **Google OAuth** — Server-side authorization-code flow with state validation and PKCE
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

All database operations (user storage, session management, etc.) happen on your server. Google OAuth additionally makes a server-side request to Google's token endpoint; it never stores user or session data locally.

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

### Google OAuth (server-side)

Create and use the Google-enabled client only in backend code. The client secret must never be included in a browser bundle.

```typescript
const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: "https://krut.ai",
  databaseUrl: process.env.DATABASE_URL!,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: "https://your-app.com/auth/google/callback",
  },
});

await auth.initialize();

// In the route that starts login:
const oauth = auth.startGoogleOAuth();
// Store oauth.state and oauth.codeVerifier in the user's server-side session,
// then redirect the browser to oauth.authorizationUrl.

// In your redirectUri callback route:
const result = await auth.completeGoogleOAuth({
  code: String(request.query.code),
  state: String(request.query.state),
  expectedState: request.session.googleOAuthState,
  codeVerifier: request.session.googleOAuthCodeVerifier,
});

// result.token is the Krut/Better Auth bearer token.
```

Register the exact `redirectUri` above as an **Authorized redirect URI** in Google Cloud. This is the consuming application's callback route; it is not a Krut backend callback or the page to which your app navigates after login. Store `state` and `codeVerifier` in an HTTP-only, server-side session and delete them after the callback succeeds or fails.

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
  google: {                     // Optional; server-side only
    clientId: "...",
    clientSecret: "...",
    redirectUri: "https://your-app.com/auth/google/callback",
    scopes: [],                 // Optional additional scopes
  },
  validateOnInit: true,        // Default: true — set false to skip in tests
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.KRUTAI_API_KEY` | Your KrutAI API key |
| `serverUrl` | `string` | `http://localhost:8000` | Base URL of your server |
| `authPrefix` | `string` | `/api/lib-auth` | Path prefix for auth routes |
| `databaseUrl` | `string` | `process.env.DATABASE_URL` | Database URL sent to server |
| `google` | `GoogleOAuthConfig` | — | Server-side Google client credentials and app callback URI |
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
| `startGoogleOAuth()` | — | Generate Google authorization URL, state, and PKCE verifier |
| `completeGoogleOAuth(params)` | Google + `POST /api/lib-auth/google/sign-in` | Exchange the Google code and create a Krut session |
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
interface GoogleOAuthConfig {
  clientId: string; clientSecret: string; redirectUri: string; scopes?: string[];
}
interface GoogleOAuthAuthorization { authorizationUrl: string; state: string; codeVerifier: string; }
interface CompleteGoogleOAuthParams {
  code: string; state: string; expectedState: string; codeVerifier: string;
}

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
| `GOOGLE_CLIENT_ID` | for Google OAuth | Read by your app and passed in `google.clientId` |
| `GOOGLE_CLIENT_SECRET` | for Google OAuth | Backend-only secret passed in `google.clientSecret` |

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
@krutai/auth@0.6.0
└── dependency: krutai   ← API key format validation (also peerDep)

Your Server
├── better-auth          ← Auth engine
└── pg / postgres        ← PostgreSQL adapter
```

For Better Auth PostgreSQL setup, see: https://www.better-auth.com/docs/adapters/postgresql

For Better Auth documentation, visit: https://www.better-auth.com/docs

## License

MIT
