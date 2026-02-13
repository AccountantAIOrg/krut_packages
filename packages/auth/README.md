# @krutai/auth

Authentication package for KrutAI powered by [Krut AI](https://www.krut.ai/).

## Features

- 🔐 **API Key Protection** - Requires valid API key for access
- 🚀 **Better Auth Integration** - Built on top of Better Auth
- 📦 **TypeScript First** - Full type safety and IntelliSense support
- 🎯 **Simple API** - Easy to use authentication client
- ⚡ **Dual Format** - Supports both ESM and CommonJS

## Installation

```bash
npm install @krutai/auth
```

> **Note:** Installing `@krutai/auth` automatically installs the parent `krutai` package, which provides centralized API key validation for all KrutAI packages.

## Quick Start

### Basic Usage

```typescript
import { KrutAuth } from '@krutai/auth';

// Initialize with your API key
const auth = new KrutAuth({
  apiKey: 'your-krutai-api-key',
  betterAuthOptions: {
    // Better Auth configuration
    database: {
      // Your database configuration
    },
  },
});

// Initialize the client (validates API key)
await auth.initialize();

// Use authentication features
const session = await auth.getSession();
```

### Without Async Initialization

If you want to skip async validation on initialization:

```typescript
const auth = new KrutAuth({
  apiKey: 'your-krutai-api-key',
  validateOnInit: false,
  betterAuthOptions: {
    // Better Auth configuration
  },
});

// No need to call initialize()
const betterAuth = auth.getBetterAuth();
```

## API Reference

### `KrutAuth`

Main authentication client class.

#### Constructor

```typescript
new KrutAuth(config: KrutAuthConfig)
```

**Parameters:**

- `config.apiKey` (required): Your KrutAI API key
- `config.betterAuthOptions` (optional): Better Auth configuration options
- `config.validateOnInit` (optional): Whether to validate API key on initialization (default: `true`)
- `config.validationEndpoint` (optional): Custom API validation endpoint

**Throws:**

- `ApiKeyValidationError` if the API key format is invalid

#### Methods

##### `initialize()`

Validates the API key and initializes the Better Auth instance.

```typescript
await auth.initialize();
```

**Returns:** `Promise<void>`

**Throws:** `ApiKeyValidationError` if validation fails

##### `getBetterAuth()`

Gets the underlying Better Auth instance for advanced usage.

```typescript
const betterAuth = auth.getBetterAuth();
```

**Returns:** `BetterAuth`

**Throws:** `Error` if not initialized

##### `isInitialized()`

Checks if the client is initialized.

```typescript
const ready = auth.isInitialized();
```

**Returns:** `boolean`

##### `getApiKey()`

Gets the API key (useful for making authenticated requests).

```typescript
const apiKey = auth.getApiKey();
```

**Returns:** `string`

## Architecture

### Dependency on Parent Package

`@krutai/auth` depends on the parent `krutai` package for API key validation:

```
@krutai/auth
└── krutai (parent)
    └── Provides: validateApiKeyFormat, validateApiKeyWithService, etc.
```

**Benefits:**
- ✅ All `@krutai/*` packages use the same validation logic from `krutai`
- ✅ No code duplication across packages
- ✅ Consistent API key handling
- ✅ Centralized validation updates benefit all packages

You can also use the validation utilities directly:

```typescript
import { validateApiKeyFormat, ApiKeyValidationError } from '@krutai/auth';
// or
import { validateApiKeyFormat, ApiKeyValidationError } from 'krutai';
```

## Error Handling

The package throws `ApiKeyValidationError` (from parent `krutai` package) when:

- API key is not provided
- API key is empty or invalid format
- API key validation fails (if `validateOnInit` is `true`)

```typescript
import { KrutAuth, ApiKeyValidationError } from '@krutai/auth';

try {
  const auth = new KrutAuth({
    apiKey: 'invalid-key',
  });
  await auth.initialize();
} catch (error) {
  if (error instanceof ApiKeyValidationError) {
    console.error('API key validation failed:', error.message);
  }
}
```

## Better Auth Integration

This package wraps [Better Auth](https://www.better-auth.com/) and adds API key validation. You can access the full Better Auth API through the `getBetterAuth()` method:

```typescript
const auth = new KrutAuth({ apiKey: 'your-key' });
await auth.initialize();

const betterAuth = auth.getBetterAuth();
// Use Better Auth features directly
```

For Better Auth documentation, visit: https://www.better-auth.com/docs

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { KrutAuthConfig, AuthSession, BetterAuthOptions } from '@krutai/auth';
```

## License

MIT
