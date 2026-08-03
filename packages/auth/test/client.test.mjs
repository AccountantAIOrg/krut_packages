import assert from "node:assert/strict";
import test from "node:test";

import { KrutAuth } from "../dist/index.mjs";

const apiKey = "krut_test_api_key_1234567890";
const serverUrl = "https://auth.example.test";
const databaseUrl = "postgresql://test:test@db.example.test/auth";

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
