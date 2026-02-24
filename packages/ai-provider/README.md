# @krutai/ai-provider

AI provider package for KrutAI — fetch-based client for your deployed LangChain server.

## Features

- 🔑 **API Key validation** — validates your key against the server before use
- 🚀 **Zero SDK dependencies** — uses native `fetch` only
- 📡 **Streaming** — SSE-based streaming via async generator
- 💬 **Multi-turn chat** — full conversation history support
- ⚙️ **Configurable** — pass any model name to the server

## Installation

```bash
npm install @krutai/ai-provider
```

## Quick Start

```typescript
import { krutAI } from '@krutai/ai-provider';

const ai = krutAI({
  apiKey: 'your-krutai-api-key',
  // Optional: omitted to use the default local dev server ('http://localhost:8000')
  // serverUrl: 'https://krut.ai',
});

await ai.initialize(); // validates key with your server

// Single response
const text = await ai.generate('Write a poem about TypeScript');
console.log(text);
```

## Usage

### Generate (single response)

```typescript
const ai = krutAI({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: 'https://krut.ai', // Override default for production
  model: 'gpt-4o', // optional — server's default is used if omitted
});

await ai.initialize();

const text = await ai.generate('Explain async/await in JavaScript', {
  system: 'You are a helpful coding tutor.',
  maxTokens: 500,
  temperature: 0.7,
});

console.log(text);
```

### Streaming

```typescript
const ai = krutAI({
  apiKey: process.env.KRUTAI_API_KEY!,
  // uses http://localhost:8000 by default
});

await ai.initialize();

// stream() is an async generator
for await (const chunk of ai.stream('Tell me a short story')) {
  process.stdout.write(chunk);
}
```

### Multi-turn Chat

```typescript
const ai = krutAI({
  apiKey: process.env.KRUTAI_API_KEY!,
});

await ai.initialize();

const response = await ai.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' },
  { role: 'assistant', content: 'Paris.' },
  { role: 'user', content: 'What is it famous for?' },
]);

console.log(response);
```

### Multimodal Messages (Images)

For vision-supported models, you can pass an array of `ContentPart`s instead of a flat string:

```typescript
const response = await ai.chat([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Describe this image for me.' },
      { 
        type: 'image_url', 
        image_url: { url: 'https://example.com/logo.png' } 
      }
    ]
  }
], { model: 'gpt-4o' });
```

### Streaming Multi-turn Chat

```typescript
const ai = krutAI({
  apiKey: process.env.KRUTAI_API_KEY!,
});

await ai.initialize();

const stream = ai.streamChat([
  { role: 'user', content: 'What is the capital of France?' },
  { role: 'assistant', content: 'Paris.' },
  { role: 'user', content: 'What is it famous for?' },
]);

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Proxying Streams to the Frontend (Next.js / API Routes)

If you are building an API route (e.g., in Next.js) and want to pipe the true Server-Sent Events (SSE) stream down to your frontend component, use the `Response` variants:

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json();

  // Returns the native fetch Response (with text/event-stream headers and body)
  const response = await ai.streamChatResponse(messages);
  
  // Proxy it directly to the frontend!
  return response;
}
```

### Skip validation (useful for tests)

```typescript
const ai = krutAI({
  apiKey: 'test-key',
  serverUrl: 'http://localhost:3000',
  validateOnInit: false, // skips the /validate round-trip
});

// No need to call initialize() when validateOnInit is false
const text = await ai.generate('Hello!');
```

## Server API Contract

Your LangChain server must expose these endpoints:

| Endpoint | Method | Auth | Body |
|---|---|---|---|
| `/validate` | POST | `x-api-key` header | `{ "apiKey": "..." }` |
| `/generate` | POST | `Authorization: Bearer <key>` | `{ "prompt": "...", "model": "...", ... }` |
| `/stream` | POST | `Authorization: Bearer <key>` | `{ "prompt": "...", "model": "...", ... }` |
| `/chat` | POST | `Authorization: Bearer <key>` | `{ "messages": [...], "model": "...", ... }` |

**Validation response:** `{ "valid": true }` or `{ "valid": false, "message": "reason" }`

**AI response:** `{ "text": "..." }` or `{ "content": "..." }` or `{ "message": "..." }`

**Stream:** `text/event-stream` with `data: <chunk>` lines, ending with `data: [DONE]`

## API Reference

### `krutAI(config)`

Factory function — preferred way to create a provider.

```typescript
const ai = krutAI({
  apiKey: string;           // required — KrutAI API key
  serverUrl?: string;       // optional — defaults to 'http://localhost:8000'
  model?: string;           // optional — passed to server (default: 'default')
  validateOnInit?: boolean; // optional — default: true
});
```

### `KrutAIProvider`

Full class API with the same methods as above. Use when you need the class directly.

### Exports

```typescript
export { krutAI, KrutAIProvider, KrutAIKeyValidationError, validateApiKey, validateApiKeyFormat, DEFAULT_MODEL };
export type { KrutAIProviderConfig, GenerateOptions, ChatMessage };
```

## License

MIT
