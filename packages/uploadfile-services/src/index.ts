import axios, { type AxiosInstance } from 'axios';
import {
    validateApiKey,
    validateApiKeyFormat,
    KrutAIKeyValidationError,
} from 'krutai';

export { KrutAIKeyValidationError };

export interface UploadFileServiceClientConfig {
    apiKey: string;
    serverUrl?: string;
    validateOnInit?: boolean;
}

export interface UploadFileResponse {
    message: string;
    fileUrl: string;
    path: string;
}

export class UploadFileServiceClient {
    private apiKey: string;
    private serverUrl: string;
    private httpClient: AxiosInstance;
    private initialized = false;
    private config: UploadFileServiceClientConfig;

    constructor(options: UploadFileServiceClientConfig) {
        this.config = options;
        this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env.KRUTAI_API_KEY : '') || '';
        this.serverUrl = (options.serverUrl || 'http://localhost:8000').replace(/\/$/, '');

        // Basic format check
        validateApiKeyFormat(this.apiKey);

        this.httpClient = axios.create({
            baseURL: this.serverUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'x-api-key': this.apiKey,
            },
        });

        if (options.validateOnInit === false) {
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

    private assertInitialized(): void {
        if (!this.initialized && this.config.validateOnInit !== false) {
            throw new Error('UploadFileServiceClient not initialized. Call initialize() first.');
        }
    }

    /**
     * Upload a file to the backend, which saves it to AWS S3 structure: userId/projectId/files/file
     * @param file The file Blob/File (or Blob-like object in Node 18+)
     * @param filename The name of the file
     * @param userId The user ID
     * @param projectId The project ID
     */
    async uploadFile(
        file: Blob | File,
        filename: string,
        userId: string,
        projectId: string
    ): Promise<UploadFileResponse> {
        this.assertInitialized();
        
        const formData = new FormData();
        formData.append('file', file, filename);
        formData.append('userId', userId);
        formData.append('projectId', projectId);

        const response = await this.httpClient.post('/library/files', formData, {
            headers: {
                // Axios will automatically set Content-Type to multipart/form-data with boundary
                'Content-Type': 'multipart/form-data',
            }
        });

        return response.data;
    }

    /**
     * Get a file access URL by its key or fetch the file content
     * @param key The file key (e.g. userId/projectId/files/timestamp_filename)
     * @param fetchContent If true, returns the actual file blob/buffer instead of just the URL
     */
    async getFile(key: string, fetchContent: boolean = false): Promise<string | any> {
        this.assertInitialized();

        if (fetchContent) {
            // Fetch the actual file blob/buffer from the server
            const response = await this.httpClient.get(`/library/files`, {
                params: { key },
                responseType: 'blob'
            });
            return response.data;
        } else {
            // Just return the URL to the file
            return `${this.serverUrl}/library/files?key=${encodeURIComponent(key)}`;
        }
    }
}
