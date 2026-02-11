import type { BetterAuthOptions } from 'better-auth';

/**
 * Configuration options for KrutAuth
 */
export interface KrutAuthConfig {
    /**
     * API key for authentication with KrutAI services
     * @required
     */
    apiKey: string;

    /**
     * Better Auth configuration options
     * @see https://www.better-auth.com/docs
     */
    betterAuthOptions?: Partial<BetterAuthOptions>;

    /**
     * Whether to validate the API key on initialization
     * @default true
     */
    validateOnInit?: boolean;

    /**
     * Custom API validation endpoint
     */
    validationEndpoint?: string;
}

/**
 * Authentication session interface
 */
export interface AuthSession {
    user: {
        id: string;
        email: string;
        name?: string;
        [key: string]: unknown;
    };
    session: {
        id: string;
        expiresAt: Date;
        [key: string]: unknown;
    };
}

/**
 * Re-export Better Auth types for convenience
 */
export type { BetterAuthOptions } from 'better-auth';
