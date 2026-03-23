import type {
    KrutAuthConfig,
    SignUpEmailParams,
    SignInEmailParams,
    AuthSession,
    AuthResponse,
} from './types';
import { DEFAULT_SERVER_URL, DEFAULT_AUTH_PREFIX } from './types';
import {
    validateApiKeyWithService as validateApiKey,
    validateApiKeyFormat,
    ApiKeyValidationError as KrutAuthKeyValidationError,
} from 'krutai';

export { KrutAuthKeyValidationError };

/**
 * KrutAuth — fetch-based authentication client for KrutAI
 *
 * Calls your deployed server's `/lib-auth` routes for all auth operations.
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
 * // Sign up
 * const { token, user } = await auth.signUpEmail({
 *   email: 'user@example.com',
 *   password: 'secret123',
 *   name: 'Alice',
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
    private readonly config: KrutAuthConfig;

    private initialized = false;

    constructor(config: KrutAuthConfig) {
        this.config = config;
        this.apiKey = config.apiKey || process.env.KRUTAI_API_KEY || '';
        this.serverUrl = (config.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, '');
        this.authPrefix = (config.authPrefix ?? DEFAULT_AUTH_PREFIX).replace(/\/$/, '');

        // Basic format check immediately on construction
        validateApiKeyFormat(this.apiKey);

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
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'x-api-key': this.apiKey,
        };
    }

    /**
     * Build the full URL for an auth endpoint.
     * @param path - The better-auth sub-path, e.g. `/api/auth/sign-up/email`
     */
    private url(path: string): string {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.serverUrl}${this.authPrefix}${cleanPath}`;
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
     * Calls: POST {serverUrl}/lib-auth/api/auth/sign-up/email
     *
     * @param params - Sign-up parameters (email, password, name)
     * @returns The auth response containing token and user
     */
    async signUpEmail(params: SignUpEmailParams): Promise<AuthResponse> {
        return this.request<AuthResponse>('POST', '/api/auth/sign-up/email', params);
    }

    /**
     * Sign in with email and password.
     *
     * Calls: POST {serverUrl}/lib-auth/api/auth/sign-in/email
     *
     * @param params - Sign-in parameters (email, password)
     * @returns The auth response containing token and user
     */
    async signInEmail(params: SignInEmailParams): Promise<AuthResponse> {
        return this.request<AuthResponse>('POST', '/api/auth/sign-in/email', params);
    }

    /**
     * Get the current session for a user.
     *
     * Calls: GET {serverUrl}/lib-auth/api/auth/get-session
     *
     * @param sessionToken - The session token (Bearer token from sign-in)
     * @returns The session containing user and session data
     */
    async getSession(sessionToken: string): Promise<AuthSession> {
        this.assertInitialized();

        const response = await fetch(this.url('/api/auth/get-session'), {
            method: 'GET',
            headers: {
                ...this.authHeaders(),
                Cookie: `better-auth.session_token=${sessionToken}`,
            },
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
     * Calls: POST {serverUrl}/lib-auth/api/auth/sign-out
     *
     * @param sessionToken - The session token to invalidate
     */
    async signOut(sessionToken: string): Promise<void> {
        this.assertInitialized();

        const response = await fetch(this.url('/api/auth/sign-out'), {
            method: 'POST',
            headers: {
                ...this.authHeaders(),
                Cookie: `better-auth.session_token=${sessionToken}`,
            },
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
