/**
 * @krutai/auth - Authentication package for KrutAI
 * 
 * This package provides authentication functionality powered by Better Auth
 * with API key validation to ensure secure access.
 * 
 * @packageDocumentation
 */

// Export main client
export { KrutAuth } from './client';

// Export types
export type { KrutAuthConfig, AuthSession, BetterAuthOptions } from './types';

// Export validator utilities
export {
    validateApiKeyFormat,
    validateApiKeyWithService,
    ApiKeyValidationError,
} from './validator';

// Package metadata
export const VERSION = '0.1.0';
