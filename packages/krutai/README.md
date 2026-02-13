# krutai

Main KrutAI package with core utilities.

## Installation

```bash
npm install krutai
```

## Overview

**krutai** is the parent package for the KrutAI ecosystem. It provides:
- ✅ **Centralized API Key Validation** - All `@krutai/*` packages use krutai's validation
- ✅ **Core Utilities** - Shared types and utilities for the KrutAI ecosystem
- ✅ **Zero Dependencies** - Lightweight and fast

All scoped packages (`@krutai/auth`, etc.) depend on `krutai` and automatically install it.

## Usage

### Basic Usage

```typescript
import { VERSION, metadata } from 'krutai';

console.log(`KrutAI v${VERSION}`);
console.log(metadata);
```

### API Key Validation

All `@krutai/*` packages use krutai's centralized API validation:

```typescript
import { 
    validateApiKeyFormat, 
    validateApiKeyWithService,
    createApiKeyChecker,
    ApiKeyValidationError 
} from 'krutai';

// Format validation
try {
    validateApiKeyFormat('my-api-key-123456');
    console.log('Valid API key format');
} catch (error) {
    if (error instanceof ApiKeyValidationError) {
        console.error('Invalid API key:', error.message);
    }
}

// Service validation
const isValid = await validateApiKeyWithService('my-api-key-123456');

// Cached validation
const checker = createApiKeyChecker('my-api-key-123456');
await checker.validate(); // Validates and caches result
await checker.validate(); // Uses cached result
```

## Architecture

### Parent-Child Dependency Structure

```
krutai (parent)
├── Provides: API validation, core utilities
├── Dependencies: None
└── Used by: All @krutai/* packages

@krutai/auth (child)
├── Depends on: krutai
├── Uses: krutai's API validation
└── Provides: Better Auth integration
```

**Benefits:**
- 🎯 **Centralized Validation** - Single source of truth for API key validation
- 📦 **Automatic Installation** - Installing `@krutai/auth` automatically installs `krutai`
- 🔄 **No Duplication** - All packages share the same validation logic
- ✨ **Consistency** - Uniform API key handling across the ecosystem

## Available Packages

KrutAI is organized as a monorepo with specialized packages:

- **[@krutai/auth](../auth)** - Authentication package powered by [Krut AI](https://www.krut.ai/).

## Development

```bash
# Build the package
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck
```

## License

MIT
