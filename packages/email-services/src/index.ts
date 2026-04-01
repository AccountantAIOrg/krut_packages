import axios, { type AxiosInstance } from 'axios';

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

export class EmailServiceClient {
    private apiKey: string;
    private serverUrl: string;
    private httpClient: AxiosInstance;

    constructor(options: { apiKey: string; serverUrl?: string }) {
        this.apiKey = options.apiKey;
        this.serverUrl = options.serverUrl || 'http://localhost:8000';

        this.httpClient = axios.create({
            baseURL: this.serverUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Get the Google OAuth login URL from the backend.
     * Use this URL to redirect the user to Google for authentication.
     */
    getLoginUrl(): string {
        return `${this.serverUrl}/api/email/auth/google`;
    }

    /**
     * Call the backend to read emails with optional filters.
     * @param tokens The OAuth tokens returned by the callback
     * @param filters Filter options for email search
     */
    async readEmail(tokens: any, filters?: EmailFilterOptions): Promise<EmailData> {
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
        const response = await this.httpClient.post('/api/email/send', {
            tokens,
            to,
            subject,
            body,
        });
        return response.data;
    }

    async markAsRead(tokens: any, messageId: string): Promise<any> {
        const response = await this.httpClient.post('/api/email/mark-read', {
            tokens,
            messageId,
        });
        return response.data;
    }
}
