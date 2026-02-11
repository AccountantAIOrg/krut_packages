# krutai - AI Assistant Reference Guide

## Package Overview

`krutai` is the main KrutAI package that provides core utilities, metadata, and base types for the KrutAI ecosystem. This is a lightweight package that serves as the foundation for other scoped packages.

## Installation

```bash
npm install krutai
```

## Core Concepts

### Purpose
- Provides version information and package metadata
- Exports base TypeScript types used across KrutAI packages
- Serves as the main entry point for KrutAI ecosystem

### Scoped Packages
The KrutAI ecosystem includes specialized scoped packages:
- `@krutai/auth` - Authentication with Better Auth
- `@krutai/analytics` - Analytics features (coming soon)
- `@krutai/roles` - Role-based access control (coming soon)
- `@krutai/llm` - LLM integration (coming soon)

## Main Exports

### Constants

#### `VERSION`
Current version of the krutai package.

```typescript
import { VERSION } from 'krutai';
console.log(VERSION); // "0.1.0"
```

#### `metadata`
Package metadata object.

```typescript
import { metadata } from 'krutai';
console.log(metadata);
// {
//   name: 'krutai',
//   version: '0.1.0',
//   description: 'KrutAI - AI-powered utilities and core package'
// }
```

### Types

#### `KrutAIMetadata`
Interface for package metadata.

```typescript
interface KrutAIMetadata {
  name: string;
  version: string;
  description: string;
}
```

#### `KrutAIConfig`
Base configuration interface for KrutAI packages.

```typescript
interface KrutAIConfig {
  apiKey: string;                    // API key for authentication
  options?: Record<string, unknown>; // Optional configuration
}
```

## Usage Examples

### Example 1: Check Package Version

```typescript
import { VERSION } from 'krutai';

console.log(`Running KrutAI v${VERSION}`);
```

### Example 2: Get Package Metadata

```typescript
import { metadata } from 'krutai';

console.log(`Package: ${metadata.name}`);
console.log(`Version: ${metadata.version}`);
console.log(`Description: ${metadata.description}`);
```

### Example 3: Use Base Types

```typescript
import type { KrutAIConfig, KrutAIMetadata } from 'krutai';

// Use in your own package
interface MyConfig extends KrutAIConfig {
  customOption: string;
}

const config: MyConfig = {
  apiKey: 'my-key',
  customOption: 'value',
  options: {
    debug: true
  }
};
```

### Example 4: Type-Safe Configuration

```typescript
import type { KrutAIConfig } from 'krutai';

function createClient(config: KrutAIConfig) {
  // TypeScript ensures apiKey is provided
  console.log('API Key:', config.apiKey);
  console.log('Options:', config.options);
}

createClient({
  apiKey: 'my-api-key',
  options: {
    timeout: 5000
  }
});
```

## Common Patterns

### Pattern 1: Version Checking

```typescript
import { VERSION } from 'krutai';

const requiredVersion = '0.1.0';
if (VERSION !== requiredVersion) {
  console.warn(`Expected version ${requiredVersion}, got ${VERSION}`);
}
```

### Pattern 2: Logging Package Info

```typescript
import { metadata } from 'krutai';

function logStartup() {
  console.log('='.repeat(50));
  console.log(`${metadata.name} v${metadata.version}`);
  console.log(metadata.description);
  console.log('='.repeat(50));
}

logStartup();
```

### Pattern 3: Extending Base Config

```typescript
import type { KrutAIConfig } from 'krutai';

interface DatabaseConfig extends KrutAIConfig {
  database: {
    host: string;
    port: number;
  };
}

const config: DatabaseConfig = {
  apiKey: process.env.API_KEY!,
  database: {
    host: 'localhost',
    port: 5432
  }
};
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { 
  KrutAIMetadata, 
  KrutAIConfig 
} from 'krutai';
```

All exports are fully typed for IntelliSense and type checking.

## Package Ecosystem

The `krutai` package is part of a larger ecosystem:

### Available Packages

- **krutai** (this package) - Core utilities and types
- **@krutai/auth** - Authentication with Better Auth and API key validation

### Coming Soon

- **@krutai/analytics** - Analytics and tracking features
- **@krutai/roles** - Role-based access control
- **@krutai/llm** - LLM integration and utilities

## Installation Strategy

### Install Main Package Only

```bash
npm install krutai
```

Use when you only need core utilities and types.

### Install Specific Scoped Packages

```bash
npm install @krutai/auth
```

Use when you need specific functionality (e.g., authentication).

### Install Multiple Packages

```bash
npm install krutai @krutai/auth @krutai/analytics
```

Install multiple packages as needed for your application.

## Important Notes

1. **Lightweight**: This package is intentionally minimal
2. **Foundation**: Provides base types for other KrutAI packages
3. **No Dependencies**: Has no runtime dependencies
4. **TypeScript First**: Designed for TypeScript projects

## Related Packages

- `@krutai/auth` - Authentication package
- `@krutai/analytics` - Analytics package (coming soon)
- `@krutai/roles` - Role-based access control (coming soon)
- `@krutai/llm` - LLM integration (coming soon)

## Links

- GitHub Repository: https://github.com/yourusername/krut_packages
- Documentation: See README.md in package
