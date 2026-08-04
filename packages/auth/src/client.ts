import type {
    KrutAuthConfig,
    SignUpEmailParams,
    SignInEmailParams,
    VerifyEmailOtpParams,
    ResendVerificationOtpParams,
    RequestPasswordResetParams,
    ResetPasswordWithOtpParams,
    AuthSession,
    AuthResponse,
    PendingSignUpResponse,
    VerifyEmailOtpResponse,
    AuthSuccessResponse,
    GoogleOAuthConfig,
    GoogleOAuthAuthorization,
    CompleteGoogleOAuthParams,
} from './types';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { DEFAULT_SERVER_URL, DEFAULT_AUTH_PREFIX } from './types';
import {
    validateApiKey,
    validateApiKeyFormat,
    KrutAIKeyValidationError,
} from 'krutai';

export { KrutAIKeyValidationError };

/**
 * KrutAuth — fetch-based authentication client for KrutAI
 *
 * Calls your deployed server's `/api/lib-auth` routes for all auth operations.
 * The API key is validated against the server before use.
 *
 * @example
 * ```typescript
 * import { KrutAuth } from '@krutai/auth';
 *
 * const auth = new KrutAuth({
 *   apiKey: process.env.KRUTAI_API_KEY!,
 *   serverUrl: 'https://krut.ai',
 * });
 *
 * await auth.initialize(); // validates key against server
 *
 * // Sign up, then verify the code sent to the user's email.
 * await auth.signUpEmail({
 *   email: 'user@example.com',
 *   password: 'secret123',
 *   name: 'Alice',
 * });
 * const { token, user } = await auth.verifyEmailOtp({
 *   email: 'user@example.com',
 *   otp: '123456',
 * });
 *
 * // Sign in
 * const result = await auth.signInEmail({
 *   email: 'user@example.com',
 *   password: 'secret123',
 * });
 *
 * // Get session
 * const session = await auth.getSession(result.token);
 * ```
 */
export class KrutAuth {
    private readonly apiKey: string;
    private readonly serverUrl: string;
    private readonly authPrefix: string;
    private readonly databaseUrl: string;
    private readonly google?: GoogleOAuthConfig;
    private readonly config: KrutAuthConfig;

    private initialized = false;

    constructor(config: KrutAuthConfig) {
        this.config = config;
        this.apiKey = config.apiKey || process.env.KRUTAI_API_KEY || '';
        this.serverUrl = (config.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, '');
        this.authPrefix = (config.authPrefix ?? DEFAULT_AUTH_PREFIX).replace(/\/$/, '');
        this.databaseUrl = config.databaseUrl || process.env.DATABASE_URL || '';

        // Basic format check immediately on construction
        validateApiKeyFormat(this.apiKey);
        if (config.google) {
            this.validateGoogleConfig(config.google);
            this.google = {
                ...config.google,
                clientId: config.google.clientId.trim(),
                clientSecret: config.google.clientSecret.trim(),
                redirectUri: config.google.redirectUri.trim(),
            };
        }

        // If validation is disabled, mark as ready immediately
        if (config.validateOnInit === false) {
            this.initialized = true;
        }
    }

    /**
     * Initialize the auth client.
     * Validates the API key against the server, then marks client as ready.
     *
     * @throws {KrutAuthKeyValidationError} if the key is rejected or the server is unreachable
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.config.validateOnInit !== false) {
            await validateApiKey(this.apiKey, this.serverUrl);
        }

        this.initialized = true;
    }

    /**
     * Returns whether the client has been initialized.
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private assertInitialized(): void {
        if (!this.initialized) {
            throw new Error(
                'KrutAuth not initialized. Call initialize() first or set validateOnInit to false.'
            );
        }
    }

    /** Common request headers sent to the server on every auth call. */
    private authHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'x-api-key': this.apiKey,
        };

        if (this.databaseUrl) {
            headers['x-database-url'] = this.databaseUrl;
        }

        return headers;
    }

    /**
     * Build the full URL for an auth endpoint.
     * @param path - The better-auth sub-path, e.g. `/api/auth/sign-up/email`
     */
    private url(path: string): string {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.serverUrl}${this.authPrefix}${cleanPath}`;
    }

    private validateGoogleConfig(config: GoogleOAuthConfig): void {
        if (!config.clientId?.trim()) {
            throw new Error('Google OAuth clientId is required.');
        }
        if (!config.clientSecret?.trim()) {
            throw new Error('Google OAuth clientSecret is required.');
        }

        let redirectUri: URL;
        try {
            redirectUri = new URL(config.redirectUri);
        } catch {
            throw new Error('Google OAuth redirectUri must be an absolute URL.');
        }

        const isLocalhost = redirectUri.hostname === 'localhost'
            || redirectUri.hostname === '127.0.0.1'
            || redirectUri.hostname === '[::1]';
        if (redirectUri.protocol !== 'https:' && !(redirectUri.protocol === 'http:' && isLocalhost)) {
            throw new Error('Google OAuth redirectUri must use HTTPS, except for localhost development.');
        }
    }

    private requireGoogleConfig(): GoogleOAuthConfig {
        if (!this.google) {
            throw new Error('Google OAuth is not configured. Provide config.google when creating KrutAuth.');
        }
        return this.google;
    }

    private constantTimeEqual(left: string, right: string): boolean {
        const leftBytes = Buffer.from(left);
        const rightBytes = Buffer.from(right);
        return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
    }

    // ---------------------------------------------------------------------------
    // Public Auth Methods
    // ---------------------------------------------------------------------------

    /**
     * Generic request helper for any better-auth endpoint.
     *
     * Use this to call endpoints not covered by the convenience methods.
     *
     * @param method - HTTP method (GET, POST, etc.)
     * @param path - The better-auth endpoint path (e.g. `/api/auth/sign-up/email`)
     * @param body - Optional JSON body
     * @returns The parsed JSON response
     */
    async request<T = unknown>(
        method: string,
        path: string,
        body?: Record<string, unknown> | object
    ): Promise<T> {
        this.assertInitialized();

        const options: RequestInit = {
            method,
            headers: this.authHeaders(),
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(this.url(path), options);

        if (!response.ok) {
            let errorMessage = `Auth server returned HTTP ${response.status} for ${path}`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        return (await response.json()) as T;
    }

    /**
     * Sign up a new user with email and password.
     *
     * Calls: POST {serverUrl}/api/lib-auth/api/auth/sign-up/email
     *
     * @param params - Sign-up parameters (email, password, name)
     * @returns The pending user. The token remains null until email verification.
     */
    async signUpEmail(params: SignUpEmailParams): Promise<PendingSignUpResponse> {
        return this.request<PendingSignUpResponse>('POST', '/api/auth/sign-up/email', params);
    }

    /**
     * Verify the OTP sent after email/password sign-up.
     *
     * A successful verification activates the account and returns a session token.
     */
    async verifyEmailOtp(params: VerifyEmailOtpParams): Promise<VerifyEmailOtpResponse> {
        return this.request<VerifyEmailOtpResponse>('POST', '/api/auth/email-otp/verify-email', params);
    }

    /** Resend the registration email verification OTP. */
    async resendVerificationOtp(params: ResendVerificationOtpParams): Promise<AuthSuccessResponse> {
        return this.request<AuthSuccessResponse>('POST', '/api/auth/email-otp/send-verification-otp', {
            ...params,
            type: 'email-verification',
        });
    }

    /**
     * Send a password-reset OTP.
     *
     * The server intentionally returns the same response whether or not the email exists.
     */
    async requestPasswordReset(params: RequestPasswordResetParams): Promise<AuthSuccessResponse> {
        return this.request<AuthSuccessResponse>('POST', '/api/auth/email-otp/request-password-reset', params);
    }

    /** Reset an account password using the OTP sent to its email address. */
    async resetPasswordWithOtp(params: ResetPasswordWithOtpParams): Promise<AuthSuccessResponse> {
        return this.request<AuthSuccessResponse>('POST', '/api/auth/email-otp/reset-password', params);
    }

    /**
     * Sign in with email and password.
     *
     * Calls: POST {serverUrl}/api/lib-auth/api/auth/sign-in/email
     *
     * @param params - Sign-in parameters (email, password)
     * @returns The auth response containing token and user
     */
    async signInEmail(params: SignInEmailParams): Promise<AuthResponse> {
        return this.request<AuthResponse>('POST', '/api/auth/sign-in/email', params);
    }

    /**
     * Start a server-side Google OAuth authorization-code flow.
     *
     * Store `state` and `codeVerifier` in the consuming application's
     * server-side session before redirecting the browser to `authorizationUrl`.
     */
    startGoogleOAuth(): GoogleOAuthAuthorization {
        this.assertInitialized();
        const google = this.requireGoogleConfig();
        const state = randomBytes(32).toString('base64url');
        const codeVerifier = randomBytes(64).toString('base64url');
        const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
        const scopes = [...new Set([
            'openid',
            'email',
            'profile',
            ...(google.scopes ?? []).map((scope) => scope.trim()).filter(Boolean),
        ])];

        const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authorizationUrl.searchParams.set('client_id', google.clientId);
        authorizationUrl.searchParams.set('redirect_uri', google.redirectUri);
        authorizationUrl.searchParams.set('response_type', 'code');
        authorizationUrl.searchParams.set('scope', scopes.join(' '));
        authorizationUrl.searchParams.set('state', state);
        authorizationUrl.searchParams.set('code_challenge', codeChallenge);
        authorizationUrl.searchParams.set('code_challenge_method', 'S256');

        return {
            authorizationUrl: authorizationUrl.toString(),
            state,
            codeVerifier,
        };
    }

    /**
     * Complete Google OAuth from the consuming application's callback route.
     * Exchanges Google's one-time code, then creates a Better Auth session.
     */
    async completeGoogleOAuth(params: CompleteGoogleOAuthParams): Promise<AuthResponse> {
        this.assertInitialized();
        const google = this.requireGoogleConfig();

        if (!params.state || !params.expectedState || !this.constantTimeEqual(params.state, params.expectedState)) {
            throw new Error('Google OAuth state mismatch.');
        }
        if (!params.code?.trim()) {
            throw new Error('Google OAuth authorization code is required.');
        }
        if (!params.codeVerifier?.trim()) {
            throw new Error('Google OAuth PKCE code verifier is required.');
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: params.code,
                client_id: google.clientId,
                client_secret: google.clientSecret,
                redirect_uri: google.redirectUri,
                grant_type: 'authorization_code',
                code_verifier: params.codeVerifier,
            }).toString(),
        });

        let tokenData: { id_token?: string; error?: string; error_description?: string } = {};
        try {
            tokenData = await tokenResponse.json() as typeof tokenData;
        } catch {
            if (!tokenResponse.ok) {
                throw new Error(`Google OAuth token exchange failed with HTTP ${tokenResponse.status}.`);
            }
        }

        if (!tokenResponse.ok) {
            const detail = tokenData.error_description || tokenData.error;
            throw new Error(detail
                ? `Google OAuth token exchange failed: ${detail}`
                : `Google OAuth token exchange failed with HTTP ${tokenResponse.status}.`);
        }
        if (!tokenData.id_token) {
            throw new Error('Google OAuth token response did not include an ID token.');
        }

        return this.request<AuthResponse>('POST', '/google/sign-in', {
            clientId: google.clientId,
            clientSecret: google.clientSecret,
            idToken: tokenData.id_token,
        });
    }

    /**
     * Get the current session for a user.
     *
     * Calls: GET {serverUrl}/api/lib-auth/api/auth/get-session
     *
     * @param sessionToken - The session token (Bearer token from sign-in)
     * @returns The session containing user and session data
     */
    async getSession(sessionToken: string): Promise<AuthSession> {
        this.assertInitialized();

        const headers = this.authHeaders();
        // Send the session token as a Bearer token so better-auth's bearer() plugin can extract it.
        headers['Authorization'] = `Bearer ${sessionToken}`;
        
        const response = await fetch(this.url('/api/auth/get-session'), {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            let errorMessage = `Auth server returned HTTP ${response.status} for /api/auth/get-session`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }

        return (await response.json()) as AuthSession;
    }

    /**
     * Sign out the current user.
     *
     * Calls: POST {serverUrl}/api/lib-auth/api/auth/sign-out
     *
     * @param sessionToken - The session token to invalidate
     */
    async signOut(sessionToken: string): Promise<void> {
        this.assertInitialized();

        const headers = this.authHeaders();
        // Send the session token as a Bearer token so better-auth's bearer() plugin can extract it.
        headers['Authorization'] = `Bearer ${sessionToken}`;

        const response = await fetch(this.url('/api/auth/sign-out'), {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            let errorMessage = `Auth server returned HTTP ${response.status} for /api/auth/sign-out`;
            try {
                const errorData = (await response.json()) as { message?: string; error?: string };
                if (errorData?.error) errorMessage = errorData.error;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch { }
            throw new Error(errorMessage);
        }
    }
}
