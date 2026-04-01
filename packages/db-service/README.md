# @krutai/db-service

TypeScript/JavaScript client for fetching database configuration from KrutAI DB service.

## Database support

This package currently provides configuration for **PostgreSQL only**.

## Installation

```bash
npm install @krutai/db-service
```

## Quick start

```ts
import { DbService } from '@krutai/db-service';

const client = new DbService({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: 'http://localhost:8000', // optional
});

await client.initialize();

const config = await client.getDbConfig({
  projectId: 'your-project-id',
  dbName: 'your-db-name',
});

console.log(config.dbUrl); // postgres connection URL
```

## Environment variables

- `KRUTAI_API_KEY`: used automatically if `apiKey` is not passed in constructor.

## API overview

- `new DbService(config)` creates a client instance.
- `initialize()` validates API key with the service (unless `validateOnInit: false`).
- `isInitialized()` returns whether client is initialized.
- `getDbConfig({ projectId, dbName })` returns `{ dbUrl }`.
- `dbService(config)` helper returns a `DbService` instance.

## Configuration

`DbServiceConfig` fields:

- `apiKey` (string, required)
- `serverUrl` (string, optional, default: `http://localhost:8000`)
- `validateOnInit` (boolean, optional, default: `true`)

## Errors

- Throws `DbServiceKeyValidationError` for invalid or rejected API keys.
- Throws `Error` for invalid request input or non-OK responses from DB service.
