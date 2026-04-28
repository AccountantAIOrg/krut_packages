"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

class ApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyValidationError";
  }
}

function validateApiKeyFormat(apiKey: string): void {
  if (!apiKey || typeof apiKey !== "string") {
    throw new ApiKeyValidationError("API key must be a non-empty string");
  }
  if (apiKey.trim().length === 0) {
    throw new ApiKeyValidationError("API key cannot be empty or whitespace");
  }
  if (apiKey.length < 10) {
    throw new ApiKeyValidationError("API key must be at least 10 characters long");
  }
}

async function validateApiKey(
  apiKey: string | undefined,
  serverUrl: string
): Promise<boolean> {
  const key = apiKey;
  if (!key) {
    throw new ApiKeyValidationError("API key is required");
  }

  validateApiKeyFormat(key);

  const url = `${serverUrl.replace(/\/$/, "")}/api/validate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({ apiKey: key }),
  });

  let data: { valid?: boolean; message?: string; error?: string } = {};
  try {
    data = (await response.json()) as {
      valid?: boolean;
      message?: string;
      error?: string;
    };
  } catch {
    // Ignore parsing errors for non-JSON responses
  }

  if (!response.ok) {
    throw new ApiKeyValidationError(
      data.error ||
      data.message ||
      `API key validation failed: server responded with HTTP ${response.status}`
    );
  }

  if (data.valid === false) {
    throw new ApiKeyValidationError(
      data.error ?? data.message ?? "API key rejected by server"
    );
  }

  return true;
}

export interface LiveConversationConfig {
  apiKey?: string;
  serverUrl?: string;
  validateOnInit?: boolean;
}

export interface LiveConnectionOptions {
  room?: string;
  participant?: string;
  instructions?: string;
  voice?: string;
}

export interface LiveConnectionDetails {
  url: string;
  room?: string;
  participant?: string;
  instructions?: string;
  voice?: string;
}

export class liveConversation {
  private apiKey: string;
  private serverUrl: string;
  private config: LiveConversationConfig;
  private initialized = false;

  constructor(config: LiveConversationConfig) {
    this.config = config;
    this.apiKey = config.apiKey || (typeof process !== 'undefined' && process.env.KRUTAI_API_KEY) || '';
    this.serverUrl = (config.serverUrl || (typeof process !== 'undefined' && process.env.KRUTAI_SERVER_URL) || 'http://localhost:8000').replace(/\/$/, '');

    validateApiKeyFormat(this.apiKey);

    if (config.validateOnInit === false) {
      this.initialized = true;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.config.validateOnInit !== false) {
      await validateApiKey(this.apiKey, this.serverUrl);
    }
    this.initialized = true;
  }

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error('liveConversation not initialized. Call initialize() first or set validateOnInit to false.');
    }
  }

  async getLiveConnection(options?: LiveConnectionOptions): Promise<LiveConnectionDetails> {
    this.assertInitialized();
    const params = new URLSearchParams({
      ...(this.apiKey ? { krutApiKey: this.apiKey } : {}),
      ...(options?.instructions ? { prompt: options.instructions } : {}),
      ...(options?.voice ? { voice: options.voice } : {}),
      ...(options?.room ? { room: options.room } : {}),
      ...(options?.participant ? { participant: options.participant } : {}),
    });

    let hostAndPath = this.serverUrl.replace(/^http(s?):\/\//, "").replace(/\/$/, "");
    if (hostAndPath.endsWith("/api")) {
      hostAndPath = hostAndPath.slice(0, -4);
    }
    const protocol = this.serverUrl.startsWith("https://") ? "wss://" : "ws://";
    const wsUrl = `${protocol}${hostAndPath}/api/live/ws?${params.toString()}`;
    return {
      url: wsUrl,
      room: options?.room,
      participant: options?.participant,
      instructions: options?.instructions,
      voice: options?.voice,
    };
  }
}

export interface LiveConversationProps {
  apiKey?: string;
  serverUrl?: string;
  prompt?: string;
  aiVoice?: string;
  url?: string;
  onTranscriptUpdate?: (transcript: string) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onApiKeyValidationError?: (error: string) => void;
  onAudioStream?: (audioData: string) => void;
  customRender?: {
    container?: (children: ReactNode) => ReactNode;
    statusIndicator?: (props: StatusIndicatorProps) => ReactNode;
    controls?: (props: ControlsProps) => ReactNode;
    microphoneSelector?: (props: MicrophoneSelectorProps) => ReactNode;
    transcriptDisplay?: (transcript: string) => ReactNode;
  };
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface StatusIndicatorProps {
  status: ConnectionStatus;
}

export interface ControlsProps {
  isConnected: boolean;
  isRecording: boolean;
  isMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleRecording: () => void;
  onToggleMute: () => void;
}

export interface MicrophoneSelectorProps {
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  onChange: (deviceId: string) => void;
}

function base64ToFloat32AudioData(base64String: string): Float32Array {
  const byteCharacters = atob(base64String);
  const byteArray: number[] = [];

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray.push(byteCharacters.charCodeAt(i));
  }

  const audioChunks = new Uint8Array(byteArray);
  const length = audioChunks.length / 2;
  const float32AudioData = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sample = audioChunks[i * 2] | (audioChunks[i * 2 + 1] << 8);
    if (sample >= 32768) sample -= 65536;
    float32AudioData[i] = sample / 32768;
  }

  return float32AudioData;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function DefaultStatusIndicator({ status }: StatusIndicatorProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-colors ${status === "connected"
        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
        : status === "error"
          ? "bg-red-50 border-red-200 text-red-600"
          : status === "connecting"
            ? "bg-amber-50 border-amber-200 text-amber-600"
            : "bg-zinc-50 border-zinc-200 text-zinc-500"
        }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${status === "connected"
          ? "bg-emerald-500 animate-pulse"
          : status === "error"
            ? "bg-red-500"
            : status === "connecting"
              ? "bg-amber-500 animate-pulse"
              : "bg-zinc-400"
          }`}
      />
      <span>
        {status === "connected"
          ? "Connected"
          : status === "connecting"
            ? "Connecting..."
            : status === "error"
              ? "Error"
              : "Disconnected"}
      </span>
    </div>
  );
}

function DefaultControls({
  isConnected,
  isMuted,
  onConnect,
  onDisconnect,
  onToggleMute,
}: ControlsProps) {
  if (!isConnected) {
    return (
      <div className="p-4 flex items-center justify-center">
        <button
          onClick={onConnect}
          className="group relative flex items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{ width: '80px', height: '80px', background: 'linear-gradient(to bottom right, #6366f1, #9333ea)', color: 'white' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 bg-white px-8 py-4 rounded-full shadow-lg border border-zinc-100">
      <button
        onClick={onToggleMute}
        className={`flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 ${isMuted
          ? "bg-red-100 text-red-600 hover:bg-red-200"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      <button
        onClick={onDisconnect}
        className="flex items-center justify-center rounded-full shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ width: '56px', height: '56px', background: '#ef4444', color: 'white' }}
        title="End Conversation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
          <line x1="23" y1="1" x2="1" y2="23" />
        </svg>
      </button>
    </div>
  );
}

function DefaultMicrophoneSelector({
  devices,
  selectedDevice,
  onChange,
}: MicrophoneSelectorProps) {
  if (devices.length === 0) return null;

  return (
    <select
      value={selectedDevice}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border border-zinc-200 text-zinc-700 text-xs rounded-full px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all cursor-pointer hover:border-zinc-300 max-w-[160px] truncate"
    >
      <option value="" disabled>
        Select mic...
      </option>
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label || `Microphone ${device.deviceId.slice(0, 4)}`}
        </option>
      ))}
    </select>
  );
}

export function LiveConversation({
  serverUrl = "http://localhost:8000",
  apiKey,
  prompt,
  aiVoice,
  url,
  onTranscriptUpdate,
  onConnectionStatusChange,
  onApiKeyValidationError,
  onAudioStream,
  customRender,
}: LiveConversationProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [_messages, setMessages] = useState<{ type: string; content?: string }[]>(
    []
  );
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const messageQueueRef = useRef<Float32Array[]>([]);
  const queueProcessingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const selectedMicRef = useRef(selectedMic);

  useEffect(() => {
    selectedMicRef.current = selectedMic;
  }, [selectedMic]);

  useEffect(() => {
    const performApiKeyValidation = async () => {
      try {
        console.log("validate apikey", apiKey, serverUrl);
        setIsValidating(true);
        validateApiKeyFormat(apiKey || '');
        await validateApiKey(apiKey, serverUrl);
        setApiKeyError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'API key validation failed';
        setApiKeyError(errorMessage);
        onApiKeyValidationError?.(errorMessage);
      } finally {
        setIsValidating(false);
      }
    };

    if (apiKey) {
      performApiKeyValidation();
    } else {
      setIsValidating(false);
      setApiKeyError('API key is required');
      onApiKeyValidationError?.('API key is required');
    }
  }, [apiKey, serverUrl, onApiKeyValidationError]);

  const getMicDevices = useCallback(async (requestPermission = false) => {
    try {
      if (requestPermission) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      setMicDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedMic) {
        const defaultDevice = audioInputs.find((d) => d.deviceId === "default");
        setSelectedMic(defaultDevice ? defaultDevice.deviceId : audioInputs[0].deviceId);
      }
      return true;
    } catch (error) {
      console.error("[LiveConversation] Error getting devices:", error);
      return false;
    }
  }, [selectedMic]);

  useEffect(() => {
    getMicDevices(false);
    const handleDeviceChange = () => getMicDevices(false);
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [getMicDevices]);

  const updateConnectionStatus = useCallback(
    (connected: boolean) => {
      const newStatus: ConnectionStatus = connected
        ? "connected"
        : status === "connecting"
          ? "error"
          : "disconnected";
      setStatus(newStatus);
      setIsConnected(connected);
      onConnectionStatusChange?.(newStatus);
    },
    [status, onConnectionStatusChange]
  );

  const connect = useCallback(async () => {
    if (apiKeyError || isValidating) {
      return;
    }

    const hasPermission = await getMicDevices(true);
    if (!hasPermission) {
      setStatus("error");
      onConnectionStatusChange?.("error");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    setStatus("connecting");
    onConnectionStatusChange?.("connecting");

    let wsUrl = url;
    if (!wsUrl) {
      const params = new URLSearchParams({
        ...(apiKey ? { krutApiKey: apiKey } : {}),
        ...(prompt ? { prompt: prompt } : {}),
        ...(aiVoice ? { voice: aiVoice } : {}),
      });

      const isHttps = serverUrl.startsWith("https://");
      const protocol = isHttps ? "wss://" : "ws://";
      let hostAndPath = serverUrl.replace(/^http(s?):\/\//, "").replace(/\/$/, "");

      if (hostAndPath.endsWith("/api")) {
        hostAndPath = hostAndPath.slice(0, -4);
      }

      wsUrl = `${protocol}${hostAndPath}/api/live/ws?${params.toString()}`;
    }
    console.log("[LiveConversation] Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[LiveConversation] WebSocket connected");
      updateConnectionStatus(true);
      startRecording();
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("[LiveConversation] Received:", message.type);

        if (message.type === "audioStream") {
          messageQueueRef.current.push(base64ToFloat32AudioData(message.data));
          onAudioStream?.(message.data);
          if (!queueProcessingRef.current) {
            playAudioData();
          }
        } else if (message.type === "textStream") {
          setTranscript((prev) => {
            const newTranscript = prev + message.data;
            onTranscriptUpdate?.(newTranscript);
            return newTranscript;
          });
        } else if (message.type === "interrupted") {
          console.log("[LiveConversation] Interrupted by user");
          stopAllAudio();
        } else if (message.type === "liveClosed") {
          console.warn("[LiveConversation] Gemini session closed:", message.message);
          setStatus("error");
          updateConnectionStatus(false);
          stopRecording();
        } else if (message.type === "liveError") {
          console.error("[LiveConversation] Gemini session error:", message.message);
          setStatus("error");
          updateConnectionStatus(false);
          stopRecording();
        }
      } catch (error) {
        console.error("[LiveConversation] Message parse error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[LiveConversation] WebSocket error:", error);
      setStatus("error");
    };

    ws.onclose = () => {
      console.log("[LiveConversation] WebSocket disconnected");
      updateConnectionStatus(false);
      stopRecording();
    };
  }, [serverUrl, updateConnectionStatus, onTranscriptUpdate, onAudioStream, getMicDevices, apiKey, prompt, aiVoice, url]);

  const disconnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    stopRecording();
  }, []);

  const playAudioData = useCallback(async () => {
    queueProcessingRef.current = true;

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }

    const audioCtx = audioContextRef.current;

    while (messageQueueRef.current.length > 0) {
      const audioChunks = messageQueueRef.current.shift()!;

      const audioBuffer = audioCtx.createBuffer(1, audioChunks.length, 24000);
      audioBuffer.copyToChannel(audioChunks as unknown as Float32Array<ArrayBuffer>, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      activeAudioSourcesRef.current.push(source);

      source.onended = () => {
        const index = activeAudioSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeAudioSourcesRef.current.splice(index, 1);
        }
      };

      if (nextStartTimeRef.current < audioCtx.currentTime) {
        nextStartTimeRef.current = audioCtx.currentTime;
      }
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    }
    queueProcessingRef.current = false;
  }, []);

  const stopAllAudio = useCallback(() => {
    messageQueueRef.current = [];

    const sources = [...activeAudioSourcesRef.current];
    activeAudioSourcesRef.current = [];

    sources.forEach((audioSource) => {
      try {
        audioSource.stop();
        audioSource.disconnect();
      } catch (e) { }
    });

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    nextStartTimeRef.current = 0;
    queueProcessingRef.current = false;
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text.trim()) {
      wsRef.current.send(
        JSON.stringify({ type: "contentUpdateText", text: text.trim() })
      );
      setMessages((prev) => [...prev, { type: "user", content: text.trim() }]);
    }
  }, []);

  const sendAudioData = useCallback((audioData: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "realtimeInput", audioData }));
    }
  }, []);

  const startRecording = useCallback(async () => {
    const currentMic = selectedMicRef.current;
    const constraints = {
      audio: currentMic ? { deviceId: { exact: currentMic } } : true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      sourceRef.current = audioContext.createMediaStreamSource(stream);

      const workletName = "audio-recorder-worklet";

      const AudioRecordingWorklet = `
        class AudioProcessingWorklet extends AudioWorkletProcessor {
          buffer = new Int16Array(512);
          bufferWriteIndex = 0;

          constructor() {
            super();
            this.hasAudio = false;
          }

          process(inputs) {
            if (inputs[0].length) {
              const channel0 = inputs[0][0];
              this.processChunk(channel0);
            }
            return true;
          }

          sendAndClearBuffer() {
            this.port.postMessage({
              event: "chunk",
              data: {
                int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
              },
            });
            this.bufferWriteIndex = 0;
          }

          processChunk(float32Array) {
            const l = float32Array.length;
            for (let i = 0; i < l; i++) {
              const int16Value = float32Array[i] * 32768;
              this.buffer[this.bufferWriteIndex++] = int16Value;
              if (this.bufferWriteIndex >= this.buffer.length) {
                this.sendAndClearBuffer();
              }
            }
            if (this.bufferWriteIndex >= this.buffer.length) {
              this.sendAndClearBuffer();
            }
          }
        }
      `;

      const script = new Blob(
        [`registerProcessor("${workletName}", ${AudioRecordingWorklet})`],
        {
          type: "application/javascript",
        }
      );

      const src = URL.createObjectURL(script);
      await audioContext.audioWorklet.addModule(src);

      const recordingWorklet = new AudioWorkletNode(audioContext, workletName);
      audioWorkletRef.current = recordingWorklet;

      recordingWorklet.port.onmessage = (ev) => {
        const arrayBuffer = ev.data.data.int16arrayBuffer;
        if (arrayBuffer) {
          const base64 = arrayBufferToBase64(arrayBuffer);
          sendAudioData(base64);
        }
      };

      sourceRef.current.connect(recordingWorklet);
      setIsRecording(true);
    } catch (error) {
      console.error("[LiveConversation] Recording error:", error);
    }
  }, [selectedMic, sendAudioData]);

  const stopRecording = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopAllAudio();
      stopRecording();
    };
  }, [stopAllAudio, stopRecording]);

  const handleSendMessage = useCallback(() => {
    if (inputValue.trim()) {
      sendTextMessage(inputValue);
      setInputValue("");
    }
  }, [inputValue, sendTextMessage]);

  const renderContainer = (children: ReactNode) => {
    if (customRender?.container) {
      return customRender.container(children);
    }
    return (
      <div className="flex flex-col h-full w-full max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden font-sans min-h-[500px]">
        {children}
      </div>
    );
  };

  const renderStatusIndicator = () => {
    if (customRender?.statusIndicator) {
      return customRender.statusIndicator({ status });
    }
    return <DefaultStatusIndicator status={status} />;
  };

  const renderControls = () => {
    if (customRender?.controls) {
      return customRender.controls({
        isConnected,
        isRecording,
        isMuted,
        onConnect: connect,
        onDisconnect: disconnect,
        onToggleRecording: toggleRecording,
        onToggleMute: toggleMute,
      });
    }
    return (
      <DefaultControls
        isConnected={isConnected}
        isRecording={isRecording}
        isMuted={isMuted}
        onConnect={connect}
        onDisconnect={disconnect}
        onToggleRecording={toggleRecording}
        onToggleMute={toggleMute}
      />
    );
  };

  const renderMicrophoneSelector = () => {
    if (customRender?.microphoneSelector) {
      return customRender.microphoneSelector({
        devices: micDevices,
        selectedDevice: selectedMic,
        onChange: setSelectedMic,
      });
    }
    return (
      <DefaultMicrophoneSelector
        devices={micDevices}
        selectedDevice={selectedMic}
        onChange={setSelectedMic}
      />
    );
  };

  const renderTranscriptDisplay = () => {
    if (customRender?.transcriptDisplay && transcript) {
      return customRender.transcriptDisplay(transcript);
    }
    if (!transcript) return <span className="text-zinc-400 italic">Conversation transcript will appear here...</span>;
    return (
      <div className="whitespace-pre-wrap">
        {transcript}
      </div>
    );
  };

  return renderContainer(
    <>
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full shadow-lg"
            style={{ width: '32px', height: '32px', background: 'linear-gradient(to bottom right, #6366f1, #9333ea)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 tracking-tight leading-tight">AI Live Voice</h1>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Real-time Conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {renderMicrophoneSelector()}
          {renderStatusIndicator()}
        </div>
      </div>

      {(apiKeyError || isValidating) && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-red-600">
              {isValidating ? "Validating API key..." : "Invalid API Key"}
            </p>
            {!isValidating && apiKeyError && (
              <p className="text-xs text-red-500">{apiKeyError}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden bg-zinc-50/30">
        <div className="flex flex-col items-center justify-center py-6">
          {isConnected ? (
            <div className="relative flex items-center justify-center w-32 h-32 mb-6">
              <div className={`absolute inset-0 rounded-full bg-indigo-500/20 ${isRecording && !isMuted ? 'animate-ping' : ''}`}></div>
              <div
                className="relative z-10 flex items-center justify-center rounded-full transition-transform duration-500 hover:scale-105 shadow-xl"
                style={{ width: '96px', height: '96px', background: 'linear-gradient(to bottom right, #6366f1, #9333ea)' }}
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-zinc-100 flex items-center justify-center mb-4 shadow-inner border border-zinc-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-800 mb-1">Ready to converse</h3>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">Click connect to start a real-time voice conversation with the AI.</p>
            </div>
          )}

          <div className="flex justify-center">
            {renderControls()}
          </div>
        </div>

        <div className="flex-1 bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="px-4 py-2 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Live Transcript</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-zinc-700 leading-relaxed">
            {renderTranscriptDisplay()}
          </div>

          <div className="p-3 border-t border-zinc-100 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue.trim()) {
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message instead..."
                disabled={!isConnected}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-zinc-400 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!isConnected || !inputValue.trim()}
                className="absolute right-2 p-1.5 rounded-md text-indigo-500 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LiveConversation;