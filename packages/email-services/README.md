# Email Service Client

This package provides a client for interacting with an email service. It allows you to read and send emails through a backend service that handles OAuth authentication with providers like Google.

## Installation

```bash
npm install @krut/email-services
```

## Usage

### Initializing the Client

First, you need to initialize the `EmailServiceClient` with your API key and the server URL.

```typescript
import { EmailServiceClient } from '@krut/email-services';

const emailClient = new EmailServiceClient({
  apiKey: 'YOUR_API_KEY',
  serverUrl: 'http://localhost:8000', // Optional, defaults to http://localhost:8000
});
```

### Authentication

The email service uses OAuth for authentication. To start the process, get the login URL and redirect the user to it.

```typescript
const loginUrl = emailClient.getLoginUrl('frontendUrl?: string');
// Redirect the user to loginUrl
window.location.href = loginUrl;
```

After the user authenticates, they will be redirected back to your application's callback URL with OAuth tokens. You will need to handle this callback to capture the tokens.

### Reading Emails

Once you have the tokens, you can read emails. You can also apply filters to your search.

```typescript
import { EmailFilterOptions } from '@krut/email-services';

// Assuming you have the tokens from the OAuth callback
const tokens = { /* ... OAuth tokens ... */ };

const filters: EmailFilterOptions = {
  unread: true,
  maxResults: 10,
};

try {
  const emailData = await emailClient.readEmail(tokens, filters);
  console.log('Emails:', emailData.messages);
  console.log('Total count:', emailData.count);
} catch (error) {
  console.error('Error reading emails:', error);
}
```

### Sending Emails

You can also send emails using the client.

```typescript
// Assuming you have the tokens from the OAuth callback
const tokens = { /* ... OAuth tokens ... */ };

try {
  const result = await emailClient.sendEmail(
    tokens,
    'recipient@example.com',
    'Hello from the Email Service!',
    'This is the body of the email.'
  );
  console.log('Email sent successfully:', result);
} catch (error) {
  console.error('Error sending email:', error);
}
```

### Marking an Email as Read

You can mark a specific email as read using its message ID.

```typescript
// Assuming you have the tokens and a messageId
const tokens = { /* ... OAuth tokens ... */ };
const messageId = 'some-message-id';

try {
  const result = await emailClient.markAsRead(tokens, messageId);
  console.log('Email marked as read:', result);
} catch (error) {
  console.error('Error marking email as read:', error);
}
