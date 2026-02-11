/**
 * Custom error class for API key validation failures
 */
export class ApiKeyValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyValidationError';
        Object.setPrototypeOf(this, ApiKeyValidationError.prototype);
    }
}

/**
 * Validates the format of an API key
 * @param apiKey - The API key to validate
 * @throws {ApiKeyValidationError} If the API key is invalid
 */
export function validateApiKeyFormat(apiKey: string | undefined): void {
    if (!apiKey) {
        throw new ApiKeyValidationError(
            'API key is required. Please provide a valid API key to use @krutai/auth.'
        );
    }

    if (typeof apiKey !== 'string') {
        throw new ApiKeyValidationError('API key must be a string.');
    }

    if (apiKey.trim().length === 0) {
        throw new ApiKeyValidationError('API key cannot be empty.');
    }

    // Basic format validation - adjust based on your API key format
    if (apiKey.length < 10) {
        throw new ApiKeyValidationError(
            'API key appears to be invalid. Please check your API key.'
        );
    }
}

/**
 * Validates an API key against a backend service (optional)
 * This is a placeholder for actual API validation logic
 * @param _apiKey - The API key to validate (currently unused in mock implementation)
 * @returns Promise that resolves if valid, rejects if invalid
 */
export async function validateApiKeyWithService(
    _apiKey: string
): Promise<boolean> {
    // TODO: Implement actual API validation against your backend
    // For now, this is a mock implementation

    // Example implementation:
    // const response = await fetch('https://api.krutai.com/validate', {
    //   headers: { 'Authorization': `Bearer ${_apiKey}` }
    // });
    // if (!response.ok) {
    //   throw new ApiKeyValidationError('Invalid API key');
    // }
    // return true;

    // Mock validation - accepts any key that passes format validation
    return Promise.resolve(true);
}
