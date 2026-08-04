import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { KrutAuth } from "../dist/index.mjs";

const apiKey = "krut_test_api_key_1234567890";
const serverUrl = "https://auth.example.test";
const databaseUrl = "postgresql://test:test@db.example.test/auth";
const google = {
  clientId: "google-client-id.apps.googleusercontent.com",
  clientSecret: "google-client-secret",
  redirectUri: "https://app.example.test/auth/google/callback",
  scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly", "email"],
};

function createClient(requests) {
  globalThis.fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    requests.push({ url: String(url), options, body });

    if (String(url).endsWith("/sign-up/email")) {
      return Response.json({
        token: null,
        user: { id: "pending-user", email: body.email, emailVerified: false },
      });
    }
    if (String(url).endsWith("/verify-email")) {
      return Response.json({
        status: true,
        token: "verified-session",
        user: { id: "verified-user", email: body.email, emailVerified: true },
      });
    }
    return Response.json({ success: true });
  };

  return new KrutAuth({
    apiKey,
    serverUrl,
    databaseUrl,
    validateOnInit: false,
  });
}

test("registration methods use the Better Auth email OTP endpoints", async () => {
  const requests = [];
  const auth = createClient(requests);

  const pending = await auth.signUpEmail({
    email: "user@example.com",
    password: "secure-password",
    name: "Test User",
  });
  const verified = await auth.verifyEmailOtp({
    email: "user@example.com",
    otp: "123456",
  });
  await auth.resendVerificationOtp({ email: "user@example.com" });

  assert.equal(pending.token, null);
  assert.equal(pending.user.emailVerified, false);
  assert.equal(verified.token, "verified-session");
  assert.equal(verified.user.emailVerified, true);

  assert.deepEqual(
    requests.map(({ url }) => url),
    [
      `${serverUrl}/api/lib-auth/api/auth/sign-up/email`,
      `${serverUrl}/api/lib-auth/api/auth/email-otp/verify-email`,
      `${serverUrl}/api/lib-auth/api/auth/email-otp/send-verification-otp`,
    ],
  );
  assert.deepEqual(requests[2].body, {
    email: "user@example.com",
    type: "email-verification",
  });
});

test("password recovery sends the expected request bodies and protected headers", async () => {
  const requests = [];
  const auth = createClient(requests);

  await auth.requestPasswordReset({ email: "user@example.com" });
  await auth.resetPasswordWithOtp({
    email: "user@example.com",
    otp: "654321",
    password: "new-secure-password",
  });

  assert.deepEqual(requests[0].body, { email: "user@example.com" });
  assert.deepEqual(requests[1].body, {
    email: "user@example.com",
    otp: "654321",
    password: "new-secure-password",
  });
  assert.equal(requests[0].options.headers.Authorization, `Bearer ${apiKey}`);
  assert.equal(requests[0].options.headers["x-api-key"], apiKey);
  assert.equal(requests[0].options.headers["x-database-url"], databaseUrl);
});

test("startGoogleOAuth creates a stateful PKCE authorization URL without exposing the secret", () => {
  const auth = new KrutAuth({
    apiKey,
    serverUrl,
    databaseUrl,
    google,
    validateOnInit: false,
  });

  const result = auth.startGoogleOAuth();
  const url = new URL(result.authorizationUrl);
  const expectedChallenge = createHash("sha256")
    .update(result.codeVerifier)
    .digest("base64url");

  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), google.clientId);
  assert.equal(url.searchParams.get("redirect_uri"), google.redirectUri);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), result.state);
  assert.equal(url.searchParams.get("code_challenge"), expectedChallenge);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.deepEqual(url.searchParams.get("scope").split(" "), [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
  ]);
  assert.equal(result.authorizationUrl.includes(google.clientSecret), false);
});

test("completeGoogleOAuth exchanges the code and signs in through the protected backend route", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url) === "https://oauth2.googleapis.com/token") {
      return Response.json({ id_token: "google-id-token" });
    }
    if (String(url) === `${serverUrl}/api/lib-auth/google/sign-in`) {
      return Response.json({
        token: "krut-session-token",
        user: { id: "google-user", email: "user@example.com", emailVerified: true },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const auth = new KrutAuth({
    apiKey,
    serverUrl,
    databaseUrl,
    google,
    validateOnInit: false,
  });
  const started = auth.startGoogleOAuth();
  const result = await auth.completeGoogleOAuth({
    code: "one-time-google-code",
    state: started.state,
    expectedState: started.state,
    codeVerifier: started.codeVerifier,
  });

  assert.equal(result.token, "krut-session-token");
  assert.equal(requests.length, 2);
  assert.deepEqual(
    Object.fromEntries(new URLSearchParams(requests[0].options.body)),
    {
      code: "one-time-google-code",
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: google.redirectUri,
      grant_type: "authorization_code",
      code_verifier: started.codeVerifier,
    },
  );
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    clientId: google.clientId,
    clientSecret: google.clientSecret,
    idToken: "google-id-token",
  });
  assert.equal(requests[1].options.headers["x-api-key"], apiKey);
  assert.equal(requests[1].options.headers["x-database-url"], databaseUrl);
});

test("completeGoogleOAuth rejects a state mismatch before making a network request", async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return Response.json({});
  };
  const auth = new KrutAuth({ apiKey, google, validateOnInit: false });

  await assert.rejects(
    auth.completeGoogleOAuth({
      code: "code",
      state: "returned-state",
      expectedState: "stored-state",
      codeVerifier: "verifier",
    }),
    /state mismatch/i,
  );
  assert.equal(requestCount, 0);
});

test("completeGoogleOAuth reports Google errors and missing ID tokens", async () => {
  const auth = new KrutAuth({ apiKey, google, validateOnInit: false });

  globalThis.fetch = async () => Response.json(
    { error: "invalid_grant", error_description: "Authorization code expired" },
    { status: 400 },
  );
  await assert.rejects(
    auth.completeGoogleOAuth({
      code: "expired-code",
      state: "state",
      expectedState: "state",
      codeVerifier: "verifier",
    }),
    /Authorization code expired/,
  );

  globalThis.fetch = async () => Response.json({ access_token: "access-only" });
  await assert.rejects(
    auth.completeGoogleOAuth({
      code: "code",
      state: "state",
      expectedState: "state",
      codeVerifier: "verifier",
    }),
    /did not include an ID token/i,
  );

  globalThis.fetch = async (url) => {
    if (String(url) === "https://oauth2.googleapis.com/token") {
      return Response.json({ id_token: "google-id-token" });
    }
    return Response.json({ error: "Google provider rejected the ID token" }, { status: 401 });
  };
  await assert.rejects(
    auth.completeGoogleOAuth({
      code: "code",
      state: "state",
      expectedState: "state",
      codeVerifier: "verifier",
    }),
    /Google provider rejected the ID token/,
  );
});

test("Google OAuth configuration requires a safe absolute redirect URI", () => {
  assert.throws(
    () => new KrutAuth({
      apiKey,
      google: { ...google, redirectUri: "/auth/google/callback" },
      validateOnInit: false,
    }),
    /absolute URL/i,
  );
  assert.throws(
    () => new KrutAuth({
      apiKey,
      google: { ...google, redirectUri: "http://app.example.test/callback" },
      validateOnInit: false,
    }),
    /must use HTTPS/i,
  );
  assert.doesNotThrow(() => new KrutAuth({
    apiKey,
    google: { ...google, redirectUri: "http://localhost:3000/callback" },
    validateOnInit: false,
  }));
});
