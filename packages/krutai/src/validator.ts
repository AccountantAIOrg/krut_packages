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
 * @param apiKey - The API key to validate (defaults to process.env.KRUTAI_API_KEY)
 * @throws {ApiKeyValidationError} If the API key format is invalid
 */
export function validateApiKeyFormat(apiKey?: string): void {
    const key = apiKey || process.env.KRUTAI_API_KEY;

    if (!key || typeof key !== 'string') {
        throw new ApiKeyValidationError('API key must be a non-empty string');
    }

    if (key.trim().length === 0) {
        throw new ApiKeyValidationError('API key cannot be empty or whitespace');
    }

    // Add additional format validation as needed
    // Example: Check for minimum length, allowed characters, etc.
    if (key.length < 10) {
        throw new ApiKeyValidationError('API key must be at least 10 characters long');
    }
}

/**
 * Validates an API key with the KrutAI validation service
 * @param apiKey - The API key to validate (defaults to process.env.KRUTAI_API_KEY)
 * @param serverUrl - Optional server URL to validate against (defaults to http://localhost:8000)
 * @returns Promise that resolves to true if valid, false otherwise
 */
export async function validateApiKeyWithService(
    apiKey?: string,
    serverUrl: string = 'http://localhost:8000'
): Promise<boolean> {
    const key = apiKey || process.env.KRUTAI_API_KEY;
    if (!key) {
        throw new ApiKeyValidationError('API key is required');
    }

    // First validate format
    validateApiKeyFormat(key);

    try {
        const url = `${serverUrl.replace(/\/$/, '')}/validate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
            },
            body: JSON.stringify({ apiKey: key }),
        });

        if (!response.ok) {
            throw new ApiKeyValidationError(`API key validation failed: server responded with HTTP ${response.status}`);
        }

        const data = (await response.json()) as { valid?: boolean; message?: string };

        if (data.valid === false) {
            throw new ApiKeyValidationError(data.message ?? 'API key rejected by server');
        }

        return true;
    } catch (error) {
        if (error instanceof ApiKeyValidationError) throw error;
        throw new ApiKeyValidationError(
            `Failed to reach validation endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Creates a validated API key checker function
 * @param apiKey - The API key to validate (defaults to process.env.KRUTAI_API_KEY)
 * @param serverUrl - Optional server URL to validate against
 * @returns A function that checks if the API key is valid
 */
export function createApiKeyChecker(apiKey?: string, serverUrl?: string) {
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

            validationPromise = validateApiKeyWithService(apiKey, serverUrl);
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
