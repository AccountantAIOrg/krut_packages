# krutai

Core package for the KrutAI ecosystem — provides centralized API key validation, shared types, and utilities used by all `@krutai/*` sub-packages.

## Installation

```bash
npm install krutai
```

> **Note:** You usually don't need to install `krutai` directly. It is automatically installed as a peer dependency when you install any `@krutai/*` package (e.g. `@krutai/auth`, `@krutai/rbac`).

## Overview

`krutai` is the **single source of truth** for:

- ✅ **API Key Validation** — `validateApiKeyFormat`, `validateApiKeyWithService`, `createApiKeyChecker`
- ✅ **Core Types** — `KrutAIConfig`, `KrutAIMetadata`
- ✅ **Zero Runtime Dependencies** — Lightweight and fast

## Usage

### API Key Validation

```typescript
import {
    validateApiKeyFormat,
    validateApiKeyWithService,
    createApiKeyChecker,
    ApiKeyValidationError,
} from 'krutai';

// Format validation (synchronous)
try {
    validateApiKeyFormat('my-api-key-123456');
} catch (error) {
    if (error instanceof ApiKeyValidationError) {
        console.error('Invalid format:', error.message);
    }
}

// Service validation (async)
const isValid = await validateApiKeyWithService('my-api-key-123456');

// Cached checker (validates once, caches result)
const checker = createApiKeyChecker('my-api-key-123456');
await checker.validate(); // validates + caches
await checker.validate(); // returns cached result
checker.reset();          // clear cache
```

### Package Metadata

```typescript
import { VERSION, metadata } from 'krutai';

console.log(`KrutAI v${VERSION}`);
console.log(metadata.name, metadata.description);
```

## Ecosystem

```
krutai (v0.1.2)
├── API key validation (single source of truth)
├── Core types & utilities
└── Auto-installed as peer dep by:
    ├── @krutai/auth   — Better Auth integration
    └── @krutai/rbac   — Role-Based Access Control
```

## Available Packages

| Package | Description |
|---|---|
| `krutai` | Core utilities, API validation (this package) |
| `@krutai/auth` | Authentication powered by Better Auth |
| `@krutai/rbac` | Role-Based Access Control |

## Development

```bash
npm run build      # Build the package
npm run dev        # Watch mode
npm run typecheck  # Type check
```

## License

MIT
