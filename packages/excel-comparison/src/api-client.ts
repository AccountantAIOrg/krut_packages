export interface ComparisonClientConfig {
    /**
     * KrutAI API key.
     * Optional: defaults to process.env.KRUTAI_API_KEY
     */
    apiKey?: string;

    /**
     * Base URL of your deployed comparison backend server.
     * @default "http://localhost:8000"
     * @example "https://api.krut.ai"
     */
    serverUrl?: string;

    /**
     * Request timeout in milliseconds.
     * @default 60000
     */
    timeout?: number;

    /**
     * Whether to validate the API key against the server on initialization.
     * @default true
     */
    validateOnInit?: boolean;
}

export interface CompareFilesOptions {
    matchColumn?: string;
    ignoreColumns?: string[];
    tolerance?: number;
    caseSensitive?: boolean;
}

export interface FilePreview {
    name: string;
    rowCount: number;
    columns: string[];
    sample: Record<string, unknown>[];
}

export interface PreviewResponse {
    success: boolean;
    file1?: FilePreview;
    file2?: FilePreview;
    suggestedMatchColumn?: string;
    error?: string;
}

export interface ComparisonApiResponse {
    success: boolean;
    result?: {
        summary: {
            totalRows: number;
            matchesFound: number;
            differencesFound: number;
            uniqueToFile1: number;
            uniqueToFile2: number;
            status: 'SUCCESS' | 'PARTIAL' | 'NO_MATCH';
        };
        matchColumn: string;
        metadata: {
            file1Name: string;
            file1Columns: string[];
            file1RowCount: number;
            file2Name: string;
            file2Columns: string[];
            file2RowCount: number;
        };
    };
    downloadUrl?: string;
    fileName?: string;
    error?: string;
}

export class ComparisonApiClient {
    private serverUrl: string;
    private apiKey?: string;
    private timeout: number;
    private initialized = false;
    private validateOnInit: boolean;
    private initializationPromise: Promise<void> | null = null;

    constructor(config: ComparisonClientConfig) {
        this.serverUrl = (config.serverUrl || 'http://localhost:8000').replace(/\/$/, '');
        this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env.KRUTAI_API_KEY : undefined);
        this.timeout = config.timeout ?? 60000;
        this.validateOnInit = config.validateOnInit ?? true;

        if (!this.validateOnInit) {
            this.initialized = true;
        }
    }

    /**
     * Initialize the client.
     * Validates the API key against the server if validateOnInit is true.
     * @throws {Error} If validation fails or API key is missing
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = (async () => {
            if (!this.apiKey || this.apiKey.trim().length === 0) {
                this.initializationPromise = null;
                throw new Error('No API key provided. Please set the KRUTAI_API_KEY environment variable or pass it in the config.');
            }

            try {
                // Call the validation endpoint - standard across KrutAI services
                const url = `${this.serverUrl}/validate`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                    },
                    body: JSON.stringify({ apiKey: this.apiKey }),
                });

                if (!response.ok) {
                    let errorMessage = `API key validation failed (HTTP ${response.status})`;
                    try {
                        const errorData = await response.json() as { error?: string; message?: string };
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch {
                        // Keep default
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json() as { valid?: boolean };
                if (data.valid === false) {
                    throw new Error('Invalid API key provided.');
                }

                this.initialized = true;
            } catch (err) {
                this.initializationPromise = null;
                if (err instanceof Error) throw err;
                throw new Error('Failed to validate API key with the server.');
            }
        })();

        return this.initializationPromise;
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };
        
        // Ensure we send headers if apiKey is present, even if it's an empty string 
        // (though initialize() should have caught empty strings if validateOnInit is true)
        if (this.apiKey !== undefined && this.apiKey !== null) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['x-api-key'] = this.apiKey;
        }
        return headers;
    }

    private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
        // Automatically validate on the first request if required and not already done
        if (!this.initialized && this.validateOnInit) {
            await this.initialize();
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.serverUrl}${endpoint}`, {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...options.headers,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json() as { error?: string; message?: string };
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // Keep default
                }
                throw new Error(errorMessage);
            }

            return await response.json() as T;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error) {
                if (err.name === 'AbortError') throw new Error('Request timed out');
                throw err;
            }
            throw new Error('Unknown error occurred');
        }
    }

    async compareFiles(
        file1Buffer: Buffer,
        file1Name: string,
        file2Buffer: Buffer,
        file2Name: string,
        compareOptions?: CompareFilesOptions
    ): Promise<ComparisonApiResponse> {
        const formData = new FormData();
        
        const file1Blob = new Blob([file1Buffer]);
        const file2Blob = new Blob([file2Buffer]);
        
        formData.append('file1', file1Blob, file1Name);
        formData.append('file2', file2Blob, file2Name);

        if (compareOptions?.matchColumn) {
            formData.append('matchColumn', compareOptions.matchColumn);
        }
        if (compareOptions?.ignoreColumns && compareOptions.ignoreColumns.length > 0) {
            formData.append('ignoreColumns', JSON.stringify(compareOptions.ignoreColumns));
        }
        if (compareOptions?.tolerance !== undefined) {
            formData.append('tolerance', String(compareOptions.tolerance));
        }
        if (compareOptions?.caseSensitive !== undefined) {
            formData.append('caseSensitive', String(compareOptions.caseSensitive));
        }

        try {
            return await this.request<ComparisonApiResponse>('/api/comparison/compare', {
                method: 'POST',
                body: formData,
            });
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async compareFilesFromFileObjects(
        file1: File,
        file2: File,
        compareOptions?: CompareFilesOptions
    ): Promise<ComparisonApiResponse> {
        const formData = new FormData();
        formData.append('file1', file1);
        formData.append('file2', file2);

        if (compareOptions?.matchColumn) {
            formData.append('matchColumn', compareOptions.matchColumn);
        }
        if (compareOptions?.ignoreColumns && compareOptions.ignoreColumns.length > 0) {
            formData.append('ignoreColumns', JSON.stringify(compareOptions.ignoreColumns));
        }
        if (compareOptions?.tolerance !== undefined) {
            formData.append('tolerance', String(compareOptions.tolerance));
        }
        if (compareOptions?.caseSensitive !== undefined) {
            formData.append('caseSensitive', String(compareOptions.caseSensitive));
        }

        try {
            return await this.request<ComparisonApiResponse>('/api/comparison/compare', {
                method: 'POST',
                body: formData,
            });
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async previewFiles(file1: File, file2: File): Promise<PreviewResponse> {
        const formData = new FormData();
        formData.append('file1', file1);
        formData.append('file2', file2);

        try {
            return await this.request<PreviewResponse>('/api/comparison/preview', {
                method: 'POST',
                body: formData,
            });
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async previewFilesFromBuffers(
        file1Buffer: Buffer,
        file1Name: string,
        file2Buffer: Buffer,
        file2Name: string
    ): Promise<PreviewResponse> {
        const formData = new FormData();
        formData.append('file1', new Blob([file1Buffer]), file1Name);
        formData.append('file2', new Blob([file2Buffer]), file2Name);

        try {
            return await this.request<PreviewResponse>('/api/comparison/preview', {
                method: 'POST',
                body: formData,
            });
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

export function createComparisonClient(config: ComparisonClientConfig): ComparisonApiClient {
    return new ComparisonApiClient(config);
}
