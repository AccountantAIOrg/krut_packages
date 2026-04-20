# @krutai/uploadfile-services

A TypeScript client library for uploading and retrieving files via the KrutAI backend, which stores files in S3-compatible storage (DigitalOcean Spaces / AWS S3) under a structured `userId/projectId/` path.

## Installation

```bash
npm install @krutai/uploadfile-services
# or
bun add @krutai/uploadfile-services
```

## Configuration

The client is constructed with an `UploadFileServiceClientConfig` object:

| Option            | Type      | Required | Default                    | Description                                                                  |
|-------------------|-----------|----------|----------------------------|------------------------------------------------------------------------------|
| `apiKey`          | `string`  | Yes*     | `process.env.KRUTAI_API_KEY` | Your KrutAI API key. Falls back to the environment variable if not provided. |
| `serverUrl`       | `string`  | No       | `http://localhost:8000`    | Base URL of the KrutAI backend server. Trailing slashes are stripped.        |
| `validateOnInit`  | `boolean` | No       | `true`                     | Set to `false` to skip the async server-side API key validation step.        |

## Quick Start

```typescript
import { UploadFileServiceClient } from '@krutai/uploadfile-services';

const client = new UploadFileServiceClient({
    apiKey: 'your-krutai-api-key',
    serverUrl: 'http://localhost:8000',
});

// Validate the API key against the server before making requests
await client.initialize();
```

> **Note:** Every request automatically attaches the API key as both an `Authorization: Bearer <key>` header and an `x-api-key` header to the backend.

## API

### `new UploadFileServiceClient(config)`

Creates a new client instance. Performs a synchronous **format** check on the API key immediately. Throws a `KrutAIKeyValidationError` if the key format is invalid.

### `client.initialize(): Promise<void>`

Validates the API key against the server (makes a network request). Must be called before any other method unless `validateOnInit: false` was passed to the constructor.

```typescript
await client.initialize();
```

### `client.uploadFile(file, filename, userId, projectId): Promise<UploadFileResponse>`

Uploads a file to the backend. The file is stored in S3 at the path:
```
{userId}/{projectId}/{timestamp}_{filename}
```

**Parameters:**

| Parameter   | Type          | Description                              |
|-------------|---------------|------------------------------------------|
| `file`      | `Blob \| File` | The file content to upload               |
| `filename`  | `string`      | The desired name of the file             |
| `userId`    | `string`      | The ID of the user who owns the file     |
| `projectId` | `string`      | The ID of the project the file belongs to |

**Returns:** `Promise<UploadFileResponse>`

```typescript
interface UploadFileResponse {
    message: string;  // Success message from the server
    fileUrl: string;  // Public or signed URL to access the uploaded file
    path: string;     // The S3 key (e.g. "user123/proj456/1712345678_hello.txt")
}
```

**Example:**

```typescript
const fileBlob = new Blob(['Hello, world!'], { type: 'text/plain' });

const response = await client.uploadFile(fileBlob, 'hello.txt', 'user123', 'project456');

console.log(response.message);  // "File uploaded successfully"
console.log(response.fileUrl);  // Accessible URL for the file
console.log(response.path);     // "user123/project456/1712345678_hello.txt"
```

### `client.getFile(key, fetchContent?): Promise<string | any>`

Retrieves a file by its S3 key (the `path` returned by `uploadFile`).

**Parameters:**

| Parameter      | Type      | Default | Description                                                                    |
|----------------|-----------|---------|--------------------------------------------------------------------------------|
| `key`          | `string`  | —       | The S3 key of the file (e.g. value of `response.path`)                        |
| `fetchContent` | `boolean` | `false` | If `true`, downloads and returns file content from the backend response. If `false`, returns just the URL string. |

**Returns:** `Promise<string>` when `fetchContent` is `false`, and `Promise<any>` when `true` (as currently typed by the client).

**Examples:**

```typescript
// Get a direct URL to the file (no network request for the file itself)
const url = await client.getFile('user123/project456/1712345678_hello.txt');
console.log(url); // "https://your-backend.example.com/library/files?key=user123%2Fproject456%2F..."

// Download the actual file content from the backend response
const fileContent = await client.getFile('user123/project456/1712345678_hello.txt', true);
console.log(fileContent);
```

## Skipping Initialization (Advanced)

If you are in an environment where the API key is known to be valid and you want to avoid the extra round-trip, pass `validateOnInit: false`:

```typescript
const client = new UploadFileServiceClient({
    apiKey: process.env.KRUTAI_API_KEY!,
    serverUrl: 'https://your-backend.example.com',
    validateOnInit: false,
    // No need to call client.initialize()
});

const response = await client.uploadFile(file, 'report.pdf', 'user123', 'proj456');
```

## Backend Endpoints Used

| Method | Endpoint          | Description                                 |
|--------|-------------------|---------------------------------------------|
| `POST` | `/library/files`  | Upload a file (`multipart/form-data`)       |
| `GET`  | `/library/files`  | Retrieve a file or its URL using `?key=`    |
