/**
 * Types for @krutai/auth
 *
 * Pure fetch-based auth client — no local better-auth dependency.
 */

/**
 * Default base URL for the KrutAI server.
 * Used when no serverUrl is provided in the config.
 */
export const DEFAULT_SERVER_URL = 'http://localhost:8000' as const;

/**
 * Default path prefix for the auth routes on the server.
 * The server mounts better-auth under this prefix.
 */
export const DEFAULT_AUTH_PREFIX = '/lib-auth' as const;

/**
 * Configuration options for KrutAuth
 */
export interface KrutAuthConfig {
    /**
     * KrutAI API key.
     * Validated against the server before use.
     * Optional: defaults to process.env.KRUTAI_API_KEY
     */
    apiKey?: string;

    /**
     * Base URL of your deployed KrutAI server.
     * @default "http://localhost:8000"
     * @example "https://krut.ai"
     */
    serverUrl?: string;

    /**
     * Path prefix for the auth routes on the server.
     * @default "/lib-auth"
     */
    authPrefix?: string;

    /**
     * Whether to validate the API key against the server on initialization.
     * Set to false to skip the validation round-trip (e.g. in tests).
     * @default true
     */
    validateOnInit?: boolean;

    /**
     * Database URL to be passed to the backend for better-auth
     */
    databaseUrl?: string;
}

// ---------------------------------------------------------------------------
// Auth method parameter types
// ---------------------------------------------------------------------------

/**
 * Parameters for email/password sign-up
 */
export interface SignUpEmailParams {
    /** User email */
    email: string;
    /** User password */
    password: string;
    /** Display name */
    name: string;
}

/**
 * Parameters for email/password sign-in
 */
export interface SignInEmailParams {
    /** User email */
    email: string;
    /** User password */
    password: string;
}

// ---------------------------------------------------------------------------
// Auth response types
// ---------------------------------------------------------------------------

/**
 * A user record returned by the auth server
 */
export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
}

/**
 * A session record returned by the auth server
 */
export interface AuthSessionRecord {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    [key: string]: unknown;
}

/**
 * Combined session + user response
 */
export interface AuthSession {
    user: AuthUser;
    session: AuthSessionRecord;
}

/**
 * Sign-up / sign-in response (contains token + user)
 */
export interface AuthResponse {
    token: string;
    user: AuthUser;
    [key: string]: unknown;
}
