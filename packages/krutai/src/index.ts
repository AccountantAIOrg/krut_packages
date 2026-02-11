/**
 * KrutAI - AI-powered utilities and core package
 * @packageDocumentation
 */

export const VERSION = '0.1.0';

/**
 * Package metadata
 */
export const metadata = {
    name: 'krutai',
    version: VERSION,
    description: 'KrutAI - AI-powered utilities and core package',
};

/**
 * Re-export types and utilities
 */
export type { KrutAIMetadata } from './types';

// Export all from types
export * from './types';
