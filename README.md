# KrutAI

AI-powered packages for modern applications.

## Packages

This monorepo contains the following packages:

- **[krutai](./packages/krutai)** - Main package with core utilities
- **[@krutai/auth](./packages/auth)** - Authentication package powered by KrutAI

## Installation

### Install the main package

```bash
npm install krutai
```

### Install specific packages

```bash
# Authentication package
npm install @krutai/auth
```

## Quick Start

### Using @krutai/auth

```typescript
import { KrutAuth } from '@krutai/auth';

// Initialize with your API key
const auth = new KrutAuth({
  apiKey: 'your-api-key-here'
});

// Use authentication features
// ... (see @krutai/auth documentation)
```

## Development

This is a monorepo managed with npm workspaces.

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build specific package
npm run build:auth
```

## License

MIT
