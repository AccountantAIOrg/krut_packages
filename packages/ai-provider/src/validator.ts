/**
 * OpenRouter API Key Validator
 *
 * Validates the OpenRouter API key format and (optionally) its validity
 * via a configurable POST endpoint.
 *
 * The user will later provide a live POST route; until then the
 * service-level check is a placeholder that accepts any well-formed key.
 */

export class OpenRouterKeyValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OpenRouterKeyValidationError';
    }
}

/**
 * OpenRouter API keys start with "sk-or-v1-"
 */
const OPENROUTER_KEY_PREFIX = 'sk-or-v1-';
const OPENROUTER_KEY_MIN_LENGTH = 20;

/**
 * Validates the format of an OpenRouter API key.
 * @throws {OpenRouterKeyValidationError}
 */
export function validateOpenRouterKeyFormat(apiKey: string): void {
    if (!apiKey || typeof apiKey !== 'string') {
        throw new OpenRouterKeyValidationError('OpenRouter API key must be a non-empty string');
    }

    if (apiKey.trim().length === 0) {
        throw new OpenRouterKeyValidationError('OpenRouter API key cannot be empty or whitespace');
    }

    if (!apiKey.startsWith(OPENROUTER_KEY_PREFIX)) {
        throw new OpenRouterKeyValidationError(
            `OpenRouter API key must start with "${OPENROUTER_KEY_PREFIX}"`
        );
    }

    if (apiKey.length < OPENROUTER_KEY_MIN_LENGTH) {
        throw new OpenRouterKeyValidationError(
            `OpenRouter API key must be at least ${OPENROUTER_KEY_MIN_LENGTH} characters long`
        );
    }
}

/**
 * Validates the OpenRouter API key with the KrutAI validation service.
 *
 * The user will provide a live POST route later. Until then this is a
 * placeholder that accepts any key that passes format validation.
 *
 * @param apiKey - OpenRouter API key to validate
 * @param validationEndpoint - Optional POST URL to validate against
 */
export async function validateOpenRouterKeyWithService(
    apiKey: string,
    validationEndpoint?: string
): Promise<boolean> {
    // Always validate format first
    validateOpenRouterKeyFormat(apiKey);

    if (validationEndpoint) {
        try {
            const response = await fetch(validationEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
            });

            if (!response.ok) {
                throw new OpenRouterKeyValidationError(
                    `OpenRouter API key validation failed: HTTP ${response.status}`
                );
            }

            const data = (await response.json()) as { valid?: boolean };
            if (data.valid === false) {
                throw new OpenRouterKeyValidationError(
                    'OpenRouter API key rejected by validation service'
                );
            }

            return true;
        } catch (error) {
            if (error instanceof OpenRouterKeyValidationError) throw error;
            throw new OpenRouterKeyValidationError(
                `Failed to reach validation endpoint: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // TODO: Replace with live endpoint once provided
    // Placeholder — accepts any correctly-formatted key
    return true;
}
