/**
 * API Key Validation Module
 *
 * Bundled directly into @krutai/rbac — no separate `krutai` package install needed.
 */

export class ApiKeyValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ApiKeyValidationError';
    }
}

export function validateApiKeyFormat(apiKey: string): void {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new ApiKeyValidationError('API key must be a non-empty string');
    }
    if (apiKey.trim().length === 0) {
        throw new ApiKeyValidationError('API key cannot be empty or whitespace');
    }
    if (apiKey.length < 10) {
        throw new ApiKeyValidationError('API key must be at least 10 characters long');
    }
}

export async function validateApiKeyWithService(apiKey: string): Promise<boolean> {
    validateApiKeyFormat(apiKey);
    try {
        // TODO: Replace with real KrutAI validation endpoint
        // const response = await fetch('https://api.krutai.com/validate', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ apiKey })
        // });
        // return response.ok;
        return true;
    } catch (error) {
        throw new ApiKeyValidationError(
            `Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

export function createApiKeyChecker(apiKey: string) {
    let isValid: boolean | null = null;
    let validationPromise: Promise<boolean> | null = null;

    return {
        async validate(): Promise<boolean> {
            if (isValid !== null) return isValid;
            if (validationPromise) return validationPromise;
            validationPromise = validateApiKeyWithService(apiKey);
            isValid = await validationPromise;
            return isValid;
        },
        reset(): void {
            isValid = null;
            validationPromise = null;
        }
    };
}
