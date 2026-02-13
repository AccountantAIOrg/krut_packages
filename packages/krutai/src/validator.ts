/**
 * API Key Validation Module
 * 
 * Centralized API key validation for all KrutAI packages
 */

/**
 * Custom error for API key validation failures
 */
export class ApiKeyValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyValidationError';
    }
}

/**
 * Validates the format of an API key
 * @param apiKey - The API key to validate
 * @throws {ApiKeyValidationError} If the API key format is invalid
 */
export function validateApiKeyFormat(apiKey: string): void {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new ApiKeyValidationError('API key must be a non-empty string');
    }

    if (apiKey.trim().length === 0) {
        throw new ApiKeyValidationError('API key cannot be empty or whitespace');
    }

    // Add additional format validation as needed
    // Example: Check for minimum length, allowed characters, etc.
    if (apiKey.length < 10) {
        throw new ApiKeyValidationError('API key must be at least 10 characters long');
    }
}

/**
 * Validates an API key with the KrutAI service
 * @param apiKey - The API key to validate
 * @returns Promise that resolves to true if valid, false otherwise
 */
export async function validateApiKeyWithService(apiKey: string): Promise<boolean> {
    // First validate format
    validateApiKeyFormat(apiKey);

    // TODO: Implement actual API validation with KrutAI service
    // For now, this is a placeholder that accepts any properly formatted key
    // In production, this should make an HTTP request to your validation endpoint

    try {
        // Example implementation:
        // const response = await fetch('https://api.krutai.com/validate', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ apiKey })
        // });
        // return response.ok;

        // Placeholder: Accept any properly formatted key
        return true;
    } catch (error) {
        throw new ApiKeyValidationError(
            `Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Creates a validated API key checker function
 * @param apiKey - The API key to validate
 * @returns A function that checks if the API key is valid
 */
export function createApiKeyChecker(apiKey: string) {
    let isValid: boolean | null = null;
    let validationPromise: Promise<boolean> | null = null;

    return {
        /**
         * Validates the API key (cached after first call)
         */
        async validate(): Promise<boolean> {
            if (isValid !== null) {
                return isValid;
            }

            if (validationPromise) {
                return validationPromise;
            }

            validationPromise = validateApiKeyWithService(apiKey);
            isValid = await validationPromise;
            return isValid;
        },

        /**
         * Resets the validation cache
         */
        reset(): void {
            isValid = null;
            validationPromise = null;
        }
    };
}
