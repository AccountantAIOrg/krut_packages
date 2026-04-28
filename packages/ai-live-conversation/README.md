# @krutai/ai-live-conversation

AI Live Conversation is a premium React library for building real-time voice experiences with Gemini Live, powered by KrutAI. It provides a seamless, secure, and highly customizable way to integrate low-latency AI conversations into your web applications.

## Key Features

- 🎙️ **Real-time Voice**: Low-latency, full-duplex audio conversation.
- 🔐 **Secure by Design**: Support for server-side token/URL generation to keep your API keys safe.
- ✨ **Premium UI**: Beautiful, modern built-in UI with glassmorphism and smooth animations.
- 🛠️ **Extremely Customizable**: Completely override any part of the UI while keeping the underlying logic.
- 📝 **Live Transcripts**: Get real-time text transcripts of the conversation.

## Installation

```bash
npm install @krutai/ai-live-conversation
```

## Quick Start

### 1. Recommended: Secure Server-Side Integration

To keep your API key secure, initialize the connection on your server and pass the generated WebSocket URL to the client.

**Server-side (e.g., Next.js API Route or Server Action):**

```typescript
import { liveConversation } from '@krutai/ai-live-conversation';

export async function getLiveDetails() {
  const ai = new liveConversation({
    apiKey: process.env.KRUTAI_API_KEY, // Never expose this to the browser
    serverUrl: 'https://api.krut.ai', // Optional: defaults to http://localhost:8000
  });

  // Validate and connect
  await ai.initialize();

  // Generate a secure connection URL
  const details = await ai.getLiveConnection({
    instructions: 'You are a helpful travel assistant.',
    voice: 'Aoede', // Puck, Aoede, Charon, Fenrir, Kore
  });

  return details.url;
}
```

**Client-side:**

```tsx
"use client";

import { LiveConversation } from '@krutai/ai-live-conversation';

export default function App({ wsUrl }: { wsUrl: string }) {
  return (
    <div className="h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[600px]">
        <LiveConversation 
          url={wsUrl} 
          onTranscriptUpdate={(text) => console.log('Live:', text)}
        />
      </div>
    </div>
  );
}
```

### 2. Simple Client-Side Usage

For quick testing or internal tools, you can pass the API key directly.

```tsx
import { LiveConversation } from '@krutai/ai-live-conversation';

function MyAssistant() {
  return (
    <LiveConversation 
      apiKey="your-api-key"
      prompt="You are a helpful assistant."
      aiVoice="Puck"
    />
  );
}
```

## API Reference

### `LiveConversation` Component Props

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `url` | `string` | The WebSocket URL (generated via server-side SDK). |
| `apiKey` | `string` | KrutAI API key (if not using `url`). |
| `serverUrl` | `string` | KrutAI Server URL (defaults to `http://localhost:8000`). |
| `prompt` | `string` | System instructions for the AI behavior. |
| `aiVoice` | `string` | Voice selection (`Puck`, `Aoede`, `Charon`, `Fenrir`, `Kore`). |
| `onTranscriptUpdate` | `(text: string) => void` | Callback for real-time transcripts. |
| `onConnectionStatusChange`| `(status: string) => void` | Status updates: `disconnected`, `connecting`, `connected`, `error`. |
| `onApiKeyValidationError`| `(error: string) => void` | Callback triggered when API key validation fails. |
| `onAudioStream` | `(base64: string) => void` | Raw audio data stream from the AI. |
| `customRender` | `object` | UI customization hooks (see below). |

### UI Customization

You can inject your own components for any part of the interface:

```tsx
<LiveConversation
  url={url}
  customRender={{
    // Wrap the entire component
    container: (children) => <div className="custom-box">{children}</div>,
    
    // Replace the status badge
    statusIndicator: ({ status }) => <div>Status: {status}</div>,
    
    // Replace the control buttons
    controls: ({ isConnected, isMuted, onConnect, onDisconnect, onToggleMute }) => (
      <div className="custom-toolbar">
        <button onClick={isConnected ? onDisconnect : onConnect}>
          {isConnected ? 'End' : 'Start'}
        </button>
      </div>
    ),
    
    // Replace the transcript view
    transcriptDisplay: (text) => <p className="italic text-gray-500">{text}</p>
  }}
/>
```

## Advanced: Server-Side SDK (`liveConversation`)

The `liveConversation` class provides helper methods for secure initialization.

| Method | Description |
| ------ | ----------- |
| `constructor(config)` | Takes `apiKey`, `serverUrl`, and `validateOnInit` (boolean, defaults to true). |
| `initialize()` | Validates the API key against the server. |
| `getLiveConnection(options)` | Returns `{ url, room, participant, ... }` for the client. |

## Supported Voices

- **Puck**: Friendly, energetic male voice.
- **Aoede**: Calm, professional female voice.
- **Charon**: Deep, authoritative male voice.
- **Fenrir**: Warm, approachable male voice.
- **Kore**: Bright, youthful female voice.

## License

MIT © [KrutAI](https://krut.ai)
