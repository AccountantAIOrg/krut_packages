# @krutai/ai-provider

AI provider package for KrutAI — fetch-based client form our deployed server.

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
const text = await ai.chat('Write a poem about TypeScript');
console.log(text);
```

## Usage

### Chat (single response)

```typescript
const ai = krutAI({
  apiKey: process.env.KRUTAI_API_KEY!,
  serverUrl: 'https://krut.ai', // Override default for production
  model: 'gemini-3.1-pro-preview', // optional — server's default is used if omitted
});

await ai.initialize();

const text = await ai.chat('Explain async/await in JavaScript', {
  system: 'You are a helpful coding tutor.',
  maxTokens: 500,
  temperature: 0.7,
});

console.log(text);
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
], { 
  model: 'gemini-3.1-pro-preview',
  // You can also pass images, documents, or pdfs via GenerateOptions
  images: ['https://example.com/photo.jpg'],
  documents: ['https://example.com/doc.docx'],
  pdf: ['https://example.com/report.pdf']
});
```

### Streaming (Proxying SSE Streams)

If you are building an API route (e.g., in Next.js) and want to pipe the true Server-Sent Events (SSE) stream down to your backend component, use `streamChatResponse`.

`streamChatResponse` returns the raw fetch `Response` object containing the `text/event-stream` body from deployed LangChain server.

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages } = await req.json();

  // Returns the native fetch Response (with text/event-stream headers and body)
  const response = await ai.streamChatResponse(messages);
  
  // Proxy it directly to the backend!
  return response;
}
```

If you need to consume the stream in a Node environment rather than proxying it, you can read from the response body directly:

```typescript
const response = await ai.streamChatResponse([
  { role: 'user', content: 'Tell me a short story' }
]);

const reader = response.body?.getReader();
const decoder = new TextDecoder();

if (reader) {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(decoder.decode(value, { stream: true }));
  }
}
```

### Structured Output

You can request the AI to return data in a specific JSON structure (e.g. for generating models, summaries, or profiles).

```typescript
interface Profile {
  name: string;
  age: number;
}

const profile = await ai.chat<Profile>('Generate a profile for John Doe', {
  isStructure: true,
  // Pass an array of field names for simple string objects...
  output_structure: ['name', 'age'], 
  // ...or pass a full JSON Schema for complex objects
});

console.log(profile.name, profile.age);
```

### Skip validation (useful for tests)

```typescript
const ai = krutAI({
  apiKey: 'test-key',
  serverUrl: 'http://localhost:3000',
  validateOnInit: false, // skips the /validate round-trip
});

// No need to call initialize() when validateOnInit is false
const text = await ai.chat('Hello!');
```

## Server API Contract

Your LangChain server must expose these endpoints:

| Endpoint | Method | Auth | Body |
|---|---|---|---|
| `/validate` | POST | `x-api-key` header | `{ "apiKey": "..." }` |
| `/generate` | POST | `Authorization: Bearer <key>` | `{ "prompt": "...", "isStructure": boolean, "output_structure": any, ... }` |
| `/stream` | POST | `Authorization: Bearer <key>` | `{ "messages": [...], "model": "...", ... }` |

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
