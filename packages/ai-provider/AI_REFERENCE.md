# @krutai/ai-provider — AI Assistant Reference Guide

## Package Overview

- **Name**: `@krutai/ai-provider`
- **Version**: `0.2.2`
- **Purpose**: AI provider for KrutAI — fetch-based client for your deployed LangChain server with API key validation
- **Entry**: `src/index.ts` → `dist/index.{js,mjs,d.ts}`
- **Build**: `tsup` (CJS + ESM, no external SDK deps)

## Architecture

```
@krutai/ai-provider@0.2.2
 └── peerDep: krutai  (core utilities)

AI Flow:
  User App → krutAI() / KrutAIProvider
           → POST {serverUrl}/validate   (key validation)
           → POST {serverUrl}/generate   (single response)
           → POST {serverUrl}/stream     (SSE streaming)
           → POST {serverUrl}/chat       (multi-turn)
           → Your deployed LangChain server
```

## File Structure

```
packages/ai-provider/
├── src/
│   ├── index.ts      # krutAI() factory + all exports
│   ├── client.ts     # KrutAIProvider class (fetch-based)
│   ├── types.ts      # KrutAIProviderConfig, GenerateOptions, ChatMessage, DEFAULT_MODEL
│   └── validator.ts  # API key format check + server validation
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Server Endpoints (Expected by This Package)

| Endpoint | Method | Body | Response |
|---|---|---|---|
| `/validate` | POST | `{ apiKey }` | `{ valid: true/false, message? }` |
| `/generate` | POST | `{ prompt, model, system?, maxTokens?, temperature? }` | `{ text/content/message: string }` |
| `/stream` | POST | `{ prompt, model, system?, maxTokens?, temperature? }` | SSE stream `data: <chunk>` |
| `/chat` | POST | `{ messages, model, maxTokens?, temperature? }` | `{ text/content/message: string }` |

All AI endpoints receive `Authorization: Bearer <apiKey>` and `x-api-key: <apiKey>` headers.

## Main Exports

### `krutAI(config)` ← PRIMARY API

```typescript
import { krutAI } from '@krutai/ai-provider';

const ai = krutAI({
  apiKey: process.env.KRUTAI_API_KEY!,
  // uses http://localhost:8000 by default for local development
  // serverUrl: 'https://krut.ai',
});

await ai.initialize(); // validates key with server

const text = await ai.generate('Hello!');
```

### `KrutAIProvider` class ← FULL CLASS API

```typescript
import { KrutAIProvider } from '@krutai/ai-provider';

const ai = new KrutAIProvider({
  apiKey: process.env.KRUTAI_API_KEY!,
  // serverUrl: 'https://krut.ai', // Optional: defaults to localhost:8000
  model: 'gpt-4o',         // optional, default: 'default'
  validateOnInit: true,     // default: true
});

await ai.initialize();
```

**Methods:**
- `initialize(): Promise<void>` — validates key against server, marks provider ready
- `generate(prompt, opts?): Promise<string>` — single response (non-streaming)
- `stream(prompt, opts?)` — `AsyncGenerator<string>` — SSE-based streaming
- `streamResponse(prompt, opts?)` — `Promise<Response>` — returns the raw fetch Response for proxying
- `streamChat(messages, opts?)` — `AsyncGenerator<string>` — SSE multi-turn streaming
- `streamChatResponse(messages, opts?)` — `Promise<Response>` — returns the raw fetch Response for proxying
- `chat(messages, opts?): Promise<string>` — multi-turn conversation
- `getModel(): string` — active model name
- `isInitialized(): boolean`

## Types

### `KrutAIProviderConfig`

```typescript
interface KrutAIProviderConfig {
  apiKey: string;         // KrutAI API key — validated with server (required)
  serverUrl?: string;     // Base URL of deployed LangChain server (default: 'http://localhost:8000')
  model?: string;         // default: 'default'
  validateOnInit?: boolean; // default: true
}
```

```typescript
type ContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}
```

### `GenerateOptions`

```typescript
interface GenerateOptions {
  model?: string;        // override model for this call
  system?: string;       // system prompt
  maxTokens?: number;
  temperature?: number;
}
```

## Validator

Defined in `src/validator.ts`.

```typescript
export { validateApiKey, validateApiKeyFormat, KrutAIKeyValidationError };
```

### Validation Flow

1. **Format check** (sync, on construction): key must be a non-empty string
2. **Server check** (async, on `initialize()`): sends `POST {serverUrl}/validate` with the key; expects `{ valid: true }`

## tsup Configuration Notes

- Only `krutai` is external (peer dep, NOT bundled)
- No third-party AI SDK — pure native `fetch`

## Important Notes

1. **`serverUrl` defaults to `http://localhost:8000`** — make sure to override this with your deployed LangChain backend in production
2. **`apiKey` is validated server-side** — the server controls what keys are valid
3. **Streaming uses SSE** — server must respond with `Content-Type: text/event-stream`
4. **No external SDK needed** — uses native `fetch` only (Node 18+, browser, edge runtimes)
5. **Response field fallback** — tries `text → content → message` from server JSON response

## Related Packages

- `krutai` — Core utilities and API validation
- `@krutai/auth` — Authentication (wraps better-auth)
- `@krutai/rbac` — Role-Based Access Control

## Links

- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/@krutai/ai-provider
