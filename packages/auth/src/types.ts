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
export const DEFAULT_AUTH_PREFIX = '/api/lib-auth' as const;

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
     * @default "/api/lib-auth"
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

/** Parameters for verifying a registration email OTP. */
export interface VerifyEmailOtpParams {
    /** Email address used during sign-up */
    email: string;
    /** Six-digit OTP sent to the email address */
    otp: string;
}

/** Parameters for resending a registration verification OTP. */
export interface ResendVerificationOtpParams {
    /** Email address used during sign-up */
    email: string;
}

/** Parameters for requesting a password-reset OTP. */
export interface RequestPasswordResetParams {
    /** Account email address */
    email: string;
}

/** Parameters for resetting a password with an email OTP. */
export interface ResetPasswordWithOtpParams {
    /** Account email address */
    email: string;
    /** Six-digit password-reset OTP */
    otp: string;
    /** New account password */
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

/** Sign-up response while the account is awaiting email verification. */
export interface PendingSignUpResponse {
    token: null;
    user: AuthUser;
    [key: string]: unknown;
}

/** Successful email OTP verification response. */
export interface VerifyEmailOtpResponse extends AuthResponse {
    status: true;
}

/** Generic response for OTP send and password-reset operations. */
export interface AuthSuccessResponse {
    success: boolean;
    [key: string]: unknown;
}
