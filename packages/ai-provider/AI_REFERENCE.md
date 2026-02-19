# @krutai/ai-provider — AI Assistant Reference Guide

## Package Overview

- **Name**: `@krutai/ai-provider`
- **Version**: `0.1.0`
- **Purpose**: AI provider for KrutAI — wraps `@openrouter/sdk` with a `krutAI()` factory, key validation, and a configurable default model
- **Entry**: `src/index.ts` → `dist/index.{js,mjs,d.ts}`
- **Build**: `tsup` (CJS + ESM, all deps external)

## Dependency Architecture

```
@krutai/ai-provider@0.1.0
├── dependency: @openrouter/sdk  ← Official OpenRouter TypeScript SDK (external in tsup)
└── peerDep:    krutai           ← Core utilities
```

> **Important for AI**: Do NOT bundle `@openrouter/sdk` inline. It must stay external in tsup.

## File Structure

```
packages/ai-provider/
├── src/
│   ├── index.ts      # krutAI() factory + all exports
│   ├── client.ts     # KrutAIProvider class
│   ├── types.ts      # KrutAIProviderConfig, GenerateOptions, ChatMessage, DEFAULT_MODEL
│   └── validator.ts  # OpenRouter key format + service validation
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Default Model

```
qwen/qwen3-235b-a22b-thinking-2507
```

Exported as `DEFAULT_MODEL` constant. Users override via `config.model` or per-call `options.model`.

## Main Exports

### `krutAI(config?)` ← PRIMARY API

Drop-in factory. Mirrors `krutAuth` from `@krutai/auth`.

```typescript
import { krutAI } from '@krutai/ai-provider';

const ai = krutAI(); // OPENROUTER_API_KEY from env, default model
await ai.initialize();

const text = await ai.generate('Hello!');
```

### `KrutAIProvider` class ← FULL CLASS API

```typescript
import { KrutAIProvider } from '@krutai/ai-provider';

const ai = new KrutAIProvider({
  apiKey: process.env.KRUTAI_API_KEY!,
  openRouterApiKey: process.env.OPENROUTER_API_KEY!,
  model: 'openai/gpt-4o',       // optional
  validateOnInit: true,          // default
  validationEndpoint: undefined, // TODO: wire up POST route
});

await ai.initialize();
```

**Methods:**
- `initialize(): Promise<void>` — validates key + sets up OpenRouter client
- `generate(prompt, opts?): Promise<string>` — single response (non-streaming)
- `stream(prompt, opts?)` — async iterable of SSE chunks (`chunk.choices[0].delta.content`)
- `chat(messages, opts?): Promise<string>` — multi-turn conversation
- `getModel(): string` — active model name
- `getClient(): OpenRouter` — raw `@openrouter/sdk` client (advanced)
- `isInitialized(): boolean`

## Underlying SDK Call

The package calls `@openrouter/sdk` using the following structure:

```typescript
// Non-streaming
client.chat.send({
  chatGenerationParams: { model, messages, stream: false, maxTokens?, temperature? }
});

// Streaming
client.chat.send({
  chatGenerationParams: { model, messages, stream: true, maxTokens?, temperature? }
});
```

## Types

### `KrutAIProviderConfig`

```typescript
interface KrutAIProviderConfig {
  apiKey: string;                // KrutAI API key (required)
  openRouterApiKey?: string;     // falls back to process.env.OPENROUTER_API_KEY
  model?: string;                // default: DEFAULT_MODEL
  validateOnInit?: boolean;      // default: true
  validationEndpoint?: string;   // POST URL for key validation (future)
}
```

### `ChatMessage`

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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

Defined in `src/validator.ts` (NOT imported from `krutai` — OpenRouter-specific).

```typescript
export { validateOpenRouterKeyFormat, validateOpenRouterKeyWithService, OpenRouterKeyValidationError };
```

### Validation Flow

1. **Format check** (sync, on construction): key must start with `sk-or-v1-` and be ≥ 20 chars
2. **Service check** (async, on `initialize()`): if `validationEndpoint` is set, sends `POST { apiKey }` and checks response; otherwise placeholder returns `true`

## tsup Configuration Notes

- `@openrouter/sdk` → **external** (real dependency, NOT bundled)
- `krutai` → **external** (peer dep, NOT bundled)

## Important Notes

1. **`krutAI()` is the primary API** — prefer it over `new KrutAIProvider()` for simple setups
2. **Default model is `qwen/qwen3-235b-a22b-thinking-2507`** — override via `config.model` or `opts.model`
3. **OpenRouter key from env** — set `OPENROUTER_API_KEY` and omit `openRouterApiKey` in config
4. **Validation endpoint is a placeholder** — wire up the POST route when deployed
5. **Do NOT bundle `@openrouter/sdk`** — must stay external in tsup

## Related Packages

- `krutai` — Core utilities and API validation
- `@krutai/auth` — Authentication (wraps better-auth)
- `@krutai/rbac` — Role-Based Access Control

## Links

- OpenRouter SDK Docs: https://openrouter.ai/docs/sdks/typescript
- OpenRouter Models: https://openrouter.ai/models
- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/@krutai/ai-provider
