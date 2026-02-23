/**
 * API Key Validator for @krutai/ai-provider
 *
 * Validates the KrutAI API key by calling the deployed LangChain server's
 * validation endpoint. The server is expected to respond with { valid: true }
 * for a valid key and { valid: false } (or a non-2xx status) for an invalid one.
 *
 * Validation endpoint called:
 *   POST {serverUrl}/validate
 *   Headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }
 *   Body:    { "apiKey": "<key>" }
 *   Expected Response: { "valid": true }
 */

export class KrutAIKeyValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KrutAIKeyValidationError';
    }
}

/**
 * Basic sanity check — ensures the key is a non-empty string.
 * @throws {KrutAIKeyValidationError}
 */
export function validateApiKeyFormat(apiKey: string): void {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new KrutAIKeyValidationError('API key must be a non-empty string');
    }
    if (apiKey.trim().length === 0) {
        throw new KrutAIKeyValidationError('API key cannot be empty or whitespace');
    }
}

/**
 * Validates the API key against the deployed LangChain server.
 *
 * Sends a POST request to `{serverUrl}/validate` and expects:
 *   - HTTP 2xx status
 *   - JSON body: `{ "valid": true }`
 *
 * @param apiKey   - The API key to validate
 * @param serverUrl - Base URL of the LangChain backend (e.g. "https://ai.yourapp.com")
 * @throws {KrutAIKeyValidationError}
 */
export async function validateApiKey(
    apiKey: string,
    serverUrl: string
): Promise<boolean> {
    // Basic format check first
    validateApiKeyFormat(apiKey);

    if (!serverUrl || typeof serverUrl !== 'string' || serverUrl.trim().length === 0) {
        throw new KrutAIKeyValidationError('serverUrl must be a non-empty string');
    }

    const url = `${serverUrl.replace(/\/$/, '')}/validate`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({ apiKey }),
        });

        if (!response.ok) {
            throw new KrutAIKeyValidationError(
                `API key validation failed: server responded with HTTP ${response.status}`
            );
        }

        const data = (await response.json()) as { valid?: boolean; message?: string };

        if (data.valid === false) {
            throw new KrutAIKeyValidationError(
                data.message ?? 'API key rejected by server'
            );
        }

        return true;
    } catch (error) {
        if (error instanceof KrutAIKeyValidationError) throw error;
        throw new KrutAIKeyValidationError(
            `Failed to reach validation endpoint at ${url}: ${error instanceof Error ? error.message : 'Unknown error'
            }`
        );
    }
}
