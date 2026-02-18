# krutai — AI Assistant Reference Guide

## Package Overview

- **Name**: `krutai`
- **Version**: `0.1.2`
- **Purpose**: Core package for the KrutAI ecosystem — provides centralized API key validation, shared types, and utilities
- **Entry**: `src/index.ts` → `dist/index.{js,mjs,d.ts}`
- **Build**: `tsup` (CJS + ESM dual output, zero runtime dependencies)

## Role in the Ecosystem

`krutai` is the **single source of truth** for API key validation. All `@krutai/*` sub-packages declare `krutai` as a `peerDependency` and import the validator from it — there is no duplication.

```
krutai (v0.1.2)
├── Provides: validateApiKeyFormat, validateApiKeyWithService, createApiKeyChecker, ApiKeyValidationError
├── Provides: KrutAIConfig, KrutAIMetadata types
├── Dependencies: none
└── Auto-installed as peerDependency by:
    ├── @krutai/auth@0.1.4
    └── @krutai/rbac@0.1.1
```

## File Structure

```
packages/krutai/
├── src/
│   ├── index.ts      # Barrel export
│   ├── types.ts      # KrutAIMetadata, KrutAIConfig
│   └── validator.ts  # API key validation (canonical source)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Main Exports

### Constants

#### `VERSION`
```typescript
import { VERSION } from 'krutai';
// "0.1.2"
```

#### `metadata`
```typescript
import { metadata } from 'krutai';
// { name: 'krutai', version: '0.1.2', description: '...' }
```

### Types

#### `KrutAIMetadata`
```typescript
interface KrutAIMetadata {
  name: string;
  version: string;
  description: string;
}
```

#### `KrutAIConfig`
```typescript
interface KrutAIConfig {
  apiKey: string;
  options?: Record<string, unknown>;
}
```

### Validator Functions

#### `validateApiKeyFormat(apiKey: string): void`
Synchronous format check. Throws `ApiKeyValidationError` if:
- Not a string or empty
- Whitespace only
- Less than 10 characters

#### `validateApiKeyWithService(apiKey: string): Promise<boolean>`
Async service validation. Calls `validateApiKeyFormat` first, then validates against the KrutAI service.

#### `createApiKeyChecker(apiKey: string)`
Returns a cached checker object:
```typescript
const checker = createApiKeyChecker('my-api-key');
await checker.validate(); // validates + caches
await checker.validate(); // returns cached result
checker.reset();          // clear cache
```

#### `ApiKeyValidationError`
Custom error class. `error.name === 'ApiKeyValidationError'`.

## Usage Examples

### Example 1: Format Validation
```typescript
import { validateApiKeyFormat, ApiKeyValidationError } from 'krutai';

try {
  validateApiKeyFormat(process.env.API_KEY!);
} catch (e) {
  if (e instanceof ApiKeyValidationError) {
    console.error(e.message);
  }
}
```

### Example 2: Async Service Validation
```typescript
import { validateApiKeyWithService } from 'krutai';

const valid = await validateApiKeyWithService(process.env.API_KEY!);
```

### Example 3: Cached Checker
```typescript
import { createApiKeyChecker } from 'krutai';

const checker = createApiKeyChecker(process.env.API_KEY!);
// Call multiple times — only validates once
const ok = await checker.validate();
```

## Important Notes

1. **Single Source of Truth**: Never copy `validator.ts` into sub-packages — always import from `krutai`
2. **Peer Dependency**: Sub-packages list `krutai >=0.1.2` in `peerDependencies` and also in `devDependencies` for local development
3. **No Bundling**: Sub-packages must NOT add `krutai` to `noExternal` in tsup — it must remain external
4. **Zero Dependencies**: `krutai` itself has no runtime dependencies

## Related Packages

- `@krutai/auth` — Authentication with Better Auth
- `@krutai/rbac` — Role-Based Access Control

## Links

- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/krutai
