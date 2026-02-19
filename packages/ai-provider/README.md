# @krutai/ai-provider

AI Provider package for KrutAI — a thin wrapper around [`@openrouter/sdk`](https://www.npmjs.com/package/@openrouter/sdk), following the same patterns as `@krutai/auth`.

## Features

- **Default model**: `qwen/qwen3-235b-a22b-thinking-2507` (change any time)
- **OpenRouter key validation**: format check (`sk-or-v1-` prefix) on construction, optional service validation
- **Pluggable validation endpoint**: set your own POST route once it's ready
- **Text generation & streaming**: `generate()`, `stream()`, and `chat()` built on `@openrouter/sdk`
- **Mirrors `@krutai/auth` patterns**: `krutAI()` factory + `KrutAIProvider` class

---

## Installation

```bash
npm install @krutai/ai-provider
```

---

## Quick Start

### Simplest usage (no setup needed)

The OpenRouter API key is built-in by default — just install and call:

```typescript
import { krutAI } from '@krutai/ai-provider';

const ai = krutAI();
await ai.initialize();

const text = await ai.generate('Write a haiku about coding');
console.log(text);
```

> **Note:** The built-in key is temporary. It will be removed once the validation endpoint is live, at which point you will need to provide your own key via `OPENROUTER_API_KEY` env var or `openRouterApiKey` config.

### Change the model

```typescript
const ai = krutAI({ model: 'openai/gpt-4o-mini' });
await ai.initialize();

const text = await ai.generate('Hello!');
```

### Streaming

```typescript
const ai = krutAI();
await ai.initialize();

const stream = await ai.stream('Tell me a story');
for await (const chunk of stream) {
  process.stdout.write(chunk.choices?.[0]?.delta?.content ?? '');
}
```

### Multi-turn conversation

```typescript
const reply = await ai.chat([
  { role: 'user', content: 'Hi!' },
  { role: 'assistant', content: 'Hello! How can I help?' },
  { role: 'user', content: 'What is TypeScript?' },
]);
```

### Override model per call

```typescript
const text = await ai.generate('Summarise this', {
  model: 'anthropic/claude-3.5-sonnet',
  maxTokens: 512,
  temperature: 0.7,
});
```

### Using the class directly

```typescript
import { KrutAIProvider } from '@krutai/ai-provider';

const ai = new KrutAIProvider({
  apiKey: process.env.KRUTAI_API_KEY!,
  openRouterApiKey: process.env.OPENROUTER_API_KEY!,
  model: 'google/gemini-flash-1.5',  // optional override
  validateOnInit: true,               // default
});

await ai.initialize();
const text = await ai.generate('Hi!');
```

---

## API Reference

### `krutAI(config?)` — factory function

| Field | Type | Default |
|---|---|---|
| `openRouterApiKey` | `string` | `process.env.OPENROUTER_API_KEY` |
| `model` | `string` | `"qwen/qwen3-235b-a22b-thinking-2507"` |
| `validateOnInit` | `boolean` | `true` |
| `validationEndpoint` | `string` | `undefined` (placeholder) |

### `KrutAIProvider` class

| Method | Returns | Description |
|---|---|---|
| `initialize()` | `Promise<void>` | Validates key + sets up OpenRouter client |
| `generate(prompt, opts?)` | `Promise<string>` | Single response |
| `stream(prompt, opts?)` | async iterable | Streaming response |
| `chat(messages, opts?)` | `Promise<string>` | Multi-turn conversation |
| `getModel()` | `string` | Active model name |
| `getClient()` | `OpenRouter` | Raw `@openrouter/sdk` client (advanced) |
| `isInitialized()` | `boolean` | Ready check |

---

## Default Model

```
qwen/qwen3-235b-a22b-thinking-2507
```

Pass `model` in the constructor or per-call to override.  
Browse all available models at https://openrouter.ai/models.

---

## Validation

The OpenRouter key is validated for format (`sk-or-v1-` prefix) on construction.

When a `validationEndpoint` is provided, `initialize()` sends a `POST` request:
```json
{ "apiKey": "sk-or-v1-..." }
```
Expected response: `{ "valid": true }` (or any `2xx` without `valid: false`).

> The live endpoint will be wired in once you deploy the POST route.

---

## Related Packages

- [`krutai`](https://www.npmjs.com/package/krutai) — Core utilities & API validation
- [`@krutai/auth`](https://www.npmjs.com/package/@krutai/auth) — Authentication (wraps better-auth)
- [`@krutai/rbac`](https://www.npmjs.com/package/@krutai/rbac) — Role-Based Access Control

---

## Links

- OpenRouter SDK: https://openrouter.ai/docs/sdks/typescript
- Available Models: https://openrouter.ai/models
- GitHub: https://github.com/AccountantAIOrg/krut_packages
- npm: https://www.npmjs.com/package/@krutai/ai-provider
