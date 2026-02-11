import { betterAuth } from 'better-auth';
import type { KrutAuthConfig } from './types';
import {
    validateApiKeyFormat,
    validateApiKeyWithService,
} from './validator';

/**
 * KrutAuth - Authentication client for KrutAI
 * 
 * This class wraps Better Auth and adds API key validation
 * to ensure only authorized users can access authentication features.
 * 
 * @example
 * ```typescript
 * import { KrutAuth } from '@krutai/auth';
 * 
 * const auth = new KrutAuth({
 *   apiKey: 'your-api-key-here',
 *   betterAuthOptions: {
 *     // Better Auth configuration
 *   }
 * });
 * 
 * // Initialize the client (validates API key)
 * await auth.initialize();
 * 
 * // Use authentication features
 * const betterAuth = auth.getBetterAuth();
 * ```
 */
export class KrutAuth {
    private apiKey: string;
    private betterAuthInstance: ReturnType<typeof betterAuth> | null = null;
    private initialized = false;

    /**
     * Creates a new KrutAuth instance
     * @param config - Configuration options
     * @throws {ApiKeyValidationError} If API key is invalid
     */
    constructor(private config: KrutAuthConfig) {
        // Validate API key format immediately
        validateApiKeyFormat(config.apiKey);
        this.apiKey = config.apiKey;

        // Initialize if validation is not required on init
        if (config.validateOnInit === false) {
            this.initializeBetterAuth();
        }
    }

    /**
     * Initialize the authentication client
     * Validates the API key and sets up Better Auth
     * @throws {ApiKeyValidationError} If API key validation fails
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Validate API key with service if needed
        if (this.config.validateOnInit !== false) {
            await validateApiKeyWithService(this.apiKey);
        }

        this.initializeBetterAuth();
        this.initialized = true;
    }

    /**
     * Initialize Better Auth instance
     * @private
     */
    private initializeBetterAuth(): void {
        this.betterAuthInstance = betterAuth({
            ...this.config.betterAuthOptions,
            // Add any custom configuration here
        });
    }

    /**
     * Get the Better Auth instance
     * @throws {Error} If not initialized
     */
    getBetterAuth(): ReturnType<typeof betterAuth> {
        if (!this.betterAuthInstance) {
            throw new Error(
                'KrutAuth not initialized. Call initialize() first or set validateOnInit to false.'
            );
        }
        return this.betterAuthInstance;
    }

    /**
     * Check if the client is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get the API key (useful for making authenticated requests)
     * @returns The API key
     */
    getApiKey(): string {
        return this.apiKey;
    }

    /**
     * Sign in a user
     * This is a convenience method that wraps Better Auth
     * You can access the full Better Auth API via getBetterAuth()
     */
    async signIn() {
        const auth = this.getBetterAuth();
        // Return the Better Auth instance for further operations
        // Users can call methods on it directly
        return auth;
    }

    /**
     * Sign out the current user
     * You can access the full Better Auth API via getBetterAuth()
     */
    async signOut() {
        const auth = this.getBetterAuth();
        return auth;
    }

    /**
     * Get the current session
     * You can access the full Better Auth API via getBetterAuth()
     */
    async getSession() {
        const auth = this.getBetterAuth();
        return auth;
    }
}
