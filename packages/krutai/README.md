# krutai

Main KrutAI package with core utilities.

## Installation

```bash
npm install krutai
```

## Usage

```typescript
import { VERSION, metadata } from 'krutai';

console.log(`KrutAI v${VERSION}`);
console.log(metadata);
```

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
