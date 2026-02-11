# @krutai/auth - AI Assistant Reference Guide

## Package Overview

`@krutai/auth` is an authentication package for KrutAI that wraps Better Auth with mandatory API key validation. This package requires users to provide a valid API key to access authentication features.

## Installation

```bash
npm install @krutai/auth
```

## Core Concepts

### API Key Requirement
- **MANDATORY**: All users must provide a valid API key
- API key is validated on initialization (can be disabled with `validateOnInit: false`)
- Throws `ApiKeyValidationError` if API key is missing or invalid

### Better Auth Integration
- Wraps the Better Auth library
- Provides access to full Better Auth API via `getBetterAuth()`
- See Better Auth docs: https://www.better-auth.com/docs

## Main Exports

### Classes

#### `KrutAuth`
Main authentication client class.

**Constructor:**
```typescript
new KrutAuth(config: KrutAuthConfig)
```

**Methods:**
- `initialize(): Promise<void>` - Validates API key and initializes Better Auth
- `getBetterAuth(): ReturnType<typeof betterAuth>` - Returns Better Auth instance
- `isInitialized(): boolean` - Check if initialized
- `getApiKey(): string` - Get the API key
- `signIn()` - Convenience method (returns Better Auth instance)
- `signOut()` - Convenience method (returns Better Auth instance)
- `getSession()` - Convenience method (returns Better Auth instance)

### Types

#### `KrutAuthConfig`
```typescript
interface KrutAuthConfig {
  apiKey: string;                              // REQUIRED
  betterAuthOptions?: Partial<BetterAuthOptions>;
  validateOnInit?: boolean;                    // default: true
  validationEndpoint?: string;
}
```

#### `AuthSession`
```typescript
interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string;
    [key: string]: unknown;
  };
  session: {
    id: string;
    expiresAt: Date;
    [key: string]: unknown;
  };
}
```

### Errors

#### `ApiKeyValidationError`
Thrown when API key validation fails.

**Common causes:**
- API key is missing or empty
- API key is too short (< 10 characters)
- API key validation fails against backend

## Usage Examples

### Example 1: Basic Usage with Async Validation

```typescript
import { KrutAuth } from '@krutai/auth';

const auth = new KrutAuth({
  apiKey: 'your-api-key-here',
  betterAuthOptions: {
    database: {
      // your database config
    }
  }
});

// Initialize and validate API key
await auth.initialize();

// Get Better Auth instance
const betterAuth = auth.getBetterAuth();
```

### Example 2: Skip Async Validation

```typescript
import { KrutAuth } from '@krutai/auth';

const auth = new KrutAuth({
  apiKey: 'your-api-key-here',
  validateOnInit: false,
  betterAuthOptions: {
    // config
  }
});

// No need to call initialize()
const betterAuth = auth.getBetterAuth();
```

### Example 3: Error Handling

```typescript
import { KrutAuth, ApiKeyValidationError } from '@krutai/auth';

try {
  const auth = new KrutAuth({
    apiKey: 'invalid-key'
  });
  await auth.initialize();
} catch (error) {
  if (error instanceof ApiKeyValidationError) {
    console.error('API key validation failed:', error.message);
  }
}
```

### Example 4: Using Better Auth Features

```typescript
import { KrutAuth } from '@krutai/auth';

const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  betterAuthOptions: {
    database: {
      provider: 'postgres',
      url: process.env.DATABASE_URL
    },
    emailAndPassword: {
      enabled: true
    }
  }
});

await auth.initialize();

// Access full Better Auth API
const betterAuth = auth.getBetterAuth();

// Use Better Auth methods directly
// See: https://www.better-auth.com/docs
```

## Common Patterns

### Pattern 1: Environment Variable API Key

```typescript
const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY || '',
  betterAuthOptions: {
    // config
  }
});
```

### Pattern 2: Singleton Instance

```typescript
// auth.ts
let authInstance: KrutAuth | null = null;

export async function getAuth(): Promise<KrutAuth> {
  if (!authInstance) {
    authInstance = new KrutAuth({
      apiKey: process.env.KRUTAI_API_KEY!,
      betterAuthOptions: {
        // config
      }
    });
    await authInstance.initialize();
  }
  return authInstance;
}
```

### Pattern 3: Conditional Initialization

```typescript
const auth = new KrutAuth({
  apiKey: process.env.KRUTAI_API_KEY!,
  validateOnInit: process.env.NODE_ENV === 'production'
});

if (process.env.NODE_ENV === 'production') {
  await auth.initialize();
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { 
  KrutAuthConfig, 
  AuthSession, 
  BetterAuthOptions 
} from '@krutai/auth';
```

## Important Notes

1. **API Key is Required**: The package will not work without a valid API key
2. **Better Auth Wrapper**: This is a wrapper around Better Auth, not a replacement
3. **Validation**: By default, API key is validated on `initialize()` call
4. **Error Handling**: Always catch `ApiKeyValidationError` for proper error handling

## Related Packages

- `krutai` - Main KrutAI package with core utilities
- Future packages: `@krutai/analytics`, `@krutai/roles`, `@krutai/llm`

## Links

- Better Auth Documentation: https://www.better-auth.com/docs
- GitHub Repository: https://github.com/yourusername/krut_packages
