export interface ComparisonApiOptions {
    baseUrl: string;
    apiKey?: string;
    timeout?: number;
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
    private baseUrl: string;
    private apiKey?: string;
    private timeout: number;

    constructor(options: ComparisonApiOptions) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.timeout = options.timeout ?? 60000;
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

        const headers: Record<string, string> = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['x-api-key'] = this.apiKey;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/api/comparison/compare`, {
                method: 'POST',
                headers,
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json() as { error?: string; message?: string };
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // Keep default message
                }
                return {
                    success: false,
                    error: errorMessage,
                };
            }

            return await response.json() as ComparisonApiResponse;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timed out',
                };
            }
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error occurred',
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

        const headers: Record<string, string> = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['x-api-key'] = this.apiKey;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/api/comparison/compare`, {
                method: 'POST',
                headers,
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json() as { error?: string; message?: string };
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // Keep default message
                }
                return {
                    success: false,
                    error: errorMessage,
                };
            }

            return await response.json() as ComparisonApiResponse;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timed out',
                };
            }
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error occurred',
            };
        }
    }

    async previewFiles(file1: File, file2: File): Promise<PreviewResponse> {
        const formData = new FormData();
        formData.append('file1', file1);
        formData.append('file2', file2);

        const headers: Record<string, string> = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['x-api-key'] = this.apiKey;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/api/comparison/preview`, {
                method: 'POST',
                headers,
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json() as { error?: string; message?: string };
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // Keep default message
                }
                return {
                    success: false,
                    error: errorMessage,
                };
            }

            return await response.json() as PreviewResponse;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timed out',
                };
            }
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error occurred',
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

        const headers: Record<string, string> = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['x-api-key'] = this.apiKey;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/api/comparison/preview`, {
                method: 'POST',
                headers,
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json() as { error?: string; message?: string };
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // Keep default message
                }
                return {
                    success: false,
                    error: errorMessage,
                };
            }

            return await response.json() as PreviewResponse;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
                return {
                    success: false,
                    error: 'Request timed out',
                };
            }
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error occurred',
            };
        }
    }
}

export function createComparisonClient(options: ComparisonApiOptions): ComparisonApiClient {
    return new ComparisonApiClient(options);
}
