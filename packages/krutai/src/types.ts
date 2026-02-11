/**
 * KrutAI metadata interface
 */
export interface KrutAIMetadata {
    name: string;
    version: string;
    description: string;
}

/**
 * Base configuration interface for KrutAI packages
 */
export interface KrutAIConfig {
    /**
     * API key for authentication
     */
    apiKey: string;

    /**
     * Optional configuration options
     */
    options?: Record<string, unknown>;
}
