# `@krut/email-services`

This document provides a reference for the AI to understand and use the `@krut/email-services` package.

## Overview

The `@krut/email-services` package provides a client (`EmailServiceClient`) to interact with a backend email service. This service handles OAuth authentication (e.g., with Google) and allows for reading and sending emails.

## Core Component: `EmailServiceClient`

The main export of this package is the `EmailServiceClient` class.

### Constructor

`new EmailServiceClient(options)`

-   `options`: An object with the following properties:
    -   `apiKey` (string, required): The API key for authenticating with the backend service.
    -   `serverUrl` (string, optional): The URL of the email service backend. Defaults to `'http://localhost:8000'`.

### Methods

#### `getLoginUrl(): string`

-   **Description**: Returns the Google OAuth login URL from the backend. The application should redirect the user to this URL to initiate the authentication flow.
-   **Returns**: A string containing the full URL for Google authentication.

#### `async readEmail(tokens: any, filters?: EmailFilterOptions): Promise<EmailData>`

-   **Description**: Fetches emails from the authenticated user's account, with optional filtering.
-   **Parameters**:
    -   `tokens` (any, required): The OAuth tokens obtained from the authentication callback.
    -   `filters` (`EmailFilterOptions`, optional): An object to filter the emails.
-   **Returns**: A `Promise` that resolves to an `EmailData` object.

#### `async sendEmail(tokens: any, to: string, subject: string, body: string): Promise<any>`

-   **Description**: Sends an email from the authenticated user's account.
-   **Parameters**:
    -   `tokens` (any, required): The OAuth tokens.
    -   `to` (string, required): The recipient's email address.
    -   `subject` (string, required): The email subject.
    -   `body` (string, required): The email body, which can be plain text or HTML.
-   **Returns**: A `Promise` that resolves with the response from the backend service.

#### `async markAsRead(tokens: any, messageId: string): Promise<any>`

-   **Description**: Marks a specific email as read.
-   **Parameters**:
    -   `tokens` (any, required): The OAuth tokens.
    -   `messageId` (string, required): The ID of the email message to mark as read.
-   **Returns**: A `Promise` that resolves with the response from the backend service.

## Interfaces

### `EmailFilterOptions`

An object with optional properties to filter emails in `readEmail`:

-   `senderEmail?: string`: Filter by sender's email.
-   `subject?: string`: Filter by subject line.
-   `hasAttachment?: boolean`: Filter for emails that have attachments.
-   `unread?: boolean`: Filter for unread emails.
-   `dateFrom?: string`: Start date for filtering (e.g., 'YYYY-MM-DD').
-   `dateTo?: string`: End date for filtering (e.g., 'YYYY-MM-DD').
-   `maxResults?: number`: The maximum number of emails to return.

### `EmailData`

The object returned by `readEmail`:

-   `messages`: An array of `EmailMessage` objects.
-   `count`: The total number of messages that match the filter.
-   `message?`: An optional message from the service.

### `EmailMessage`

Represents a single email message:

-   `id`: Unique identifier for the email.
-   `subject`: The email subject.
-   `from`: The sender's address.
-   `to`: The recipient's address.
-   `date`: The date the email was sent.
-   `snippet`: A short snippet of the email body.
-   `body`: The full body of the email (can be plain text or HTML).
-   `attachments`: An array of `EmailAttachment` objects.
-   `isUnread`: A boolean indicating if the email is unread.

### `EmailAttachment`

Represents an email attachment:

-   `filename`: The name of the attached file.
-   `data`: The file content as a base64 encoded string.
-   `mimeType`: The MIME type of the attachment.
