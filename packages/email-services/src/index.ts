import axios, { type AxiosInstance } from 'axios';
import {
    validateApiKey,
    validateApiKeyFormat,
    KrutAIKeyValidationError,
} from 'krutai';

export { KrutAIKeyValidationError };

export interface EmailAttachment {
    filename: string;
    data: string; // base64
    mimeType: string;
}

export interface EmailMessage {
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    snippet: string;
    body: string;
    attachments: EmailAttachment[];
    isUnread: boolean;
}

export interface EmailData {
    messages: EmailMessage[];
    count: number;
    message?: string;
}

export interface EmailFilterOptions {
    senderEmail?: string;
    subject?: string;
    hasAttachment?: boolean;
    unread?: boolean;
    dateFrom?: string;
    dateTo?: string;
    maxResults?: number;
}

export interface EmailServiceClientConfig {
    apiKey: string;
    serverUrl?: string;
    validateOnInit?: boolean;
}

export class EmailServiceClient {
    private apiKey: string;
    private serverUrl: string;
    private httpClient: AxiosInstance;
    private initialized = false;
    private config: EmailServiceClientConfig;

    constructor(options: EmailServiceClientConfig) {
        this.config = options;
        this.apiKey = options.apiKey || (typeof process !== 'undefined' ? process.env.KRUTAI_API_KEY : '') || '';
        this.serverUrl = (options.serverUrl || 'http://localhost:8000').replace(/\/$/, '');

        // Basic format check
        validateApiKeyFormat(this.apiKey);

        this.httpClient = axios.create({
            baseURL: this.serverUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
            },
        });

        if (options.validateOnInit === false) {
            this.initialized = true;
        }
    }

    /**
     * Initialize the client.
     * Validates the API key against the server if validateOnInit is not false.
     * @throws {KrutAIKeyValidationError} If validation fails
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.config.validateOnInit !== false) {
            await validateApiKey(this.apiKey, this.serverUrl);
        }

        this.initialized = true;
    }

    private assertInitialized(): void {
        if (!this.initialized && this.config.validateOnInit !== false) {
            throw new Error('EmailServiceClient not initialized. Call initialize() first.');
        }
    }

    /**
     * Get the Google OAuth login URL from the backend.
     * Use this URL to redirect the user to Google for authentication.
     * @param frontendUrl Optional URL of the frontend application to redirect back to.
     */
    getLoginUrl(frontendUrl?: string): string {
        const baseUrl = `${this.serverUrl}/api/email/auth/google`;
        if (frontendUrl) {
            return `${baseUrl}?frontendUrl=${encodeURIComponent(frontendUrl)}`;
        }
        return baseUrl;
    }

    /**
     * Call the backend to read emails with optional filters.
     * @param tokens The OAuth tokens returned by the callback
     * @param filters Filter options for email search
     */
    async readEmail(tokens: any, filters?: EmailFilterOptions): Promise<EmailData> {
        this.assertInitialized();
        const response = await this.httpClient.post('/api/email/read', {
            tokens,
            ...filters,
        });
        return response.data;
    }

    /**
     * Call the backend to send an email.
     * @param tokens The OAuth tokens returned by the callback
     * @param to The recipient email address
     * @param subject The email subject
     * @param body The email body (text/plain or HTML)
     */
    async sendEmail(tokens: any, to: string, subject: string, body: string): Promise<any> {
        this.assertInitialized();
        const response = await this.httpClient.post('/api/email/send', {
            tokens,
            to,
            subject,
            body,
        });
        return response.data;
    }

    async markAsRead(tokens: any, messageId: string): Promise<any> {
        this.assertInitialized();
        const response = await this.httpClient.post('/api/email/mark-read', {
            tokens,
            messageId,
        });
        return response.data;
    }
}
