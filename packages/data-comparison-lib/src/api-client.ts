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
     * Optionally validates the API key if validateOnInit is true.
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        // In a real implementation, we might call a /health or /validate-key endpoint
        // For now, we'll just mark as initialized
        this.initialized = true;
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Accept': 'application/json',
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['x-api-key'] = this.apiKey;
        }
        return headers;
    }

    private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
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
