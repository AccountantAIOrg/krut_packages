import {
    validateApiKey,
    validateApiKeyFormat,
    KrutAIKeyValidationError,
} from 'krutai';

export { KrutAIKeyValidationError };

export interface DbServiceConfig {
    apiKey: string;
    serverUrl?: string;
    validateOnInit?: boolean;
}

export interface DbConfigRequest {
    projectId: string;
    dbName: string;
}

export interface DbConfigResponse {
    dbUrl: string;
}

export const DEFAULT_SERVER_URL = 'http://localhost:8000';
export const DEFAULT_DB_MANAGE_PREFIX = '/db-manage';

export class DbService {
    private readonly apiKey: string;
    private readonly serverUrl: string;
    private readonly dbManagePrefix: string;
    private readonly config: DbServiceConfig;
    private initialized = false;

    constructor(config: DbServiceConfig) {
        this.config = config;
        this.apiKey = config.apiKey || process.env.KRUTAI_API_KEY || '';
        this.serverUrl = (config.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, '');
        this.dbManagePrefix = DEFAULT_DB_MANAGE_PREFIX.replace(/\/$/, '');

        validateApiKeyFormat(this.apiKey);

        if (config.validateOnInit === false) {
            this.initialized = true;
        }
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.config.validateOnInit !== false) {
            await validateApiKey(this.apiKey, this.serverUrl);
        }

        this.initialized = true;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    private assertInitialized(): void {
        if (!this.initialized) {
            throw new Error(
                'DbService not initialized. Call initialize() first or set validateOnInit to false.'
            );
        }
    }

    private headers(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'x-api-key': this.apiKey,
        };
    }

    private url(path: string): string {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.serverUrl}${this.dbManagePrefix}${cleanPath}`;
    }

    async getDbConfig(request: DbConfigRequest): Promise<DbConfigResponse> {
        this.assertInitialized();

        if (!request.projectId || request.projectId.trim().length === 0) {
            throw new Error('projectId is required');
        }

        if (!request.dbName || request.dbName.trim().length === 0) {
            throw new Error('dbName is required');
        }

        const response = await fetch(this.url('/config'), {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                projectId: request.projectId,
                dbName: request.dbName,
            }),
        });

        if (!response.ok) {
            let message = `DB service returned HTTP ${response.status} for /config`;
            try {
                const errorData = (await response.json()) as {
                    message?: string;
                    error?: string;
                };
                message = errorData.error ?? errorData.message ?? message;
            } catch {
                // ignore malformed error payloads
            }
            throw new Error(message);
        }

        return (await response.json()) as DbConfigResponse;
    }
}

export function dbService(config: DbServiceConfig): DbService {
    return new DbService(config);
}

export const VERSION = '0.1.0';
