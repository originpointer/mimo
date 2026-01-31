# Message Formats

This document describes the input and output message schemas used throughout OpenClaw.

## Overview

OpenClaw uses several message formats at different stages:

1. **Channel Native** - Platform-specific format
2. **OpenClaw Message** - Normalized internal format
3. **Agent Session Message** - Format for LLM context
4. **Session Transcript** - Persistent JSONL format

## 1. Channel Native Format

Each platform has its own native format. These are normalized to OpenClaw format.

### Telegram Native Example

```typescript
{
  message_id: 123,
  from: { id: 123456789, first_name: "John" },
  chat: { id: 123456789, type: "private" },
  text: "Hello, bot!",
  date: 1234567890
}
```

### WhatsApp Native Example

```typescript
{
  key: {
    remoteJid: "1234567890@s.whatsapp.net",
    fromMe: false,
    id: "ABC123"
  },
  message: {
    conversation: "Hello!"
  },
  messageTimestamp: 1234567890
}
```

---

## 2. OpenClaw Message Format

**Location**: Used internally after channel normalization

```typescript
interface OpenClawMessage {
  // Core fields
  From: string;           // Sender identifier (platform-specific)
  To: string;             // Recipient (bot/account)
  ChatType: string;       // "direct" | "group" | "channel"

  // Content
  Text?: string;          // Message text
  MediaUrl?: string;      // Media attachment URL
  MediaType?: string;     // "image" | "audio" | "video" | "document"

  // Thread/reply context
  ReplyToId?: string;     // Message/thread ID being replied to
  MessageThreadId?: string; // Thread ID (Telegram, Google Chat)

  // Metadata
  Timestamp?: number;     // Unix timestamp
  MessageId?: string;     // Platform-specific message ID

  // Platform-specific (varies by channel)
  [key: string]: unknown;
}
```

### Example Messages

**Direct message (Telegram)**:
```json
{
  "From": "123456789",
  "To": "987654321",
  "ChatType": "direct",
  "Text": "Hello, bot!",
  "MessageId": "123",
  "Timestamp": 1234567890
}
```

**Group message (Discord)**:
```json
{
  "From": "123456789",
  "To": "987654321",
  "ChatType": "channel",
  "Text": "Hello everyone!",
  "MessageId": "456",
  "ReplyToId": "789",
  "Timestamp": 1234567890,
  "GuildId": "123456789",
  "ChannelId": "987654321"
}
```

---

## 3. Agent Session Message

**Location**: Passed to LLM and stored in session history

```typescript
interface AgentSessionMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: SessionContent[];
  timestamp?: number;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  metadata?: Record<string, unknown>;
}

type SessionContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "url"; url: string } }
  | { type: "audio"; source: { type: "url"; url: string } };

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  toolCallId: string;
  output?: string;
  error?: string;
  isPending?: boolean;
}
```

### Examples

**User message**:
```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "What's the weather in Tokyo?" }
  ],
  "timestamp": 1234567890
}
```

**Assistant response**:
```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "I'll check the weather for you." }
  ],
  "timestamp": 1234567891,
  "toolCall": {
    "id": "call_123",
    "name": "weather.get",
    "arguments": { "location": "Tokyo" }
  }
}
```

**Tool result**:
```json
{
  "role": "tool",
  "content": [
    { "type": "text", "text": "Current weather in Tokyo: 22°C, sunny" }
  ],
  "timestamp": 1234567892,
  "toolResult": {
    "toolCallId": "call_123",
    "output": "{\"temp\": 22, \"condition\": \"sunny\"}"
  }
}
```

---

## 4. Session Transcript Format (JSONL)

**Location**: `~/.openclaw/agents/{agentId}/sessions/{sessionKey}.jsonl`

Each line is a JSON object representing one message:

```typescript
interface SessionTurn {
  // Core fields
  role: "user" | "assistant" | "tool" | "system";
  content: SessionContent[];

  // Timestamp
  timestamp: number;

  // Tool fields (for tool/assistant roles)
  toolCall?: ToolCall;
  toolResult?: ToolResult;

  // Media attachments
  mediaUrls?: string[];

  // Metadata
  metadata?: {
    channel?: string;
    peerId?: string;
    messageId?: string;
    reasoning?: string;
    [key: string]: unknown;
  };

  // Compaction marker
  _compacted?: boolean;
}
```

### Example Session File

```jsonl
{"role":"system","content":[{"type":"text","text":"You are a helpful assistant."}],"timestamp":1234567800}
{"role":"user","content":[{"type":"text","text":"Hello!"}],"timestamp":1234567890,"metadata":{"channel":"telegram","peerId":"123456789","messageId":"1"}}
{"role":"assistant","content":[{"type":"text","text":"Hi there! How can I help you today?"}],"timestamp":1234567891}
{"role":"user","content":[{"type":"text","text":"What's 2+2?"}],"timestamp":1234567900,"metadata":{"channel":"telegram","peerId":"123456789","messageId":"2"}}
{"role":"assistant","content":[{"type":"text","text":"2+2 equals 4."}],"timestamp":1234567901}
{"role":"user","content":[{"type":"text","text":"Tell me a joke."}],"timestamp":1234567910,"metadata":{"channel":"telegram","peerId":"123456789","messageId":"3"}}
{"role":"assistant","content":[{"type":"text","text":"Why don't scientists trust atoms? Because they make up everything!"}],"timestamp":1234567911}
```

---

## 5. Gateway WebSocket Format

### Request (Client → Gateway)

```typescript
interface GatewayRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}
```

**Example**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "agent",
  "params": {
    "message": {
      "Text": "Hello!",
      "From": "123456789",
      "To": "987654321",
      "ChatType": "direct"
    },
    "channel": "telegram",
    "accountId": "default"
  }
}
```

### Response (Gateway → Client)

```typescript
interface GatewayResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
```

### Streaming Events (Gateway → Client)

```typescript
interface GatewayEvent {
  event: string;
  data: unknown;
}
```

**Agent event**:
```json
{
  "event": "agent",
  "data": {
    "runId": "abc123",
    "sessionKey": "agent:main:telegram:dm:123456789",
    "stream": "assistant",
    "seq": 1,
    "data": { "text": "Hello!" }
  }
}
```

**Chat event**:
```json
{
  "event": "chat",
  "data": {
    "runId": "abc123",
    "sessionKey": "agent:main:telegram:dm:123456789",
    "seq": 1,
    "state": "delta",
    "message": {
      "role": "assistant",
      "content": [{ "type": "text", "text": "Hello!" }],
      "timestamp": 1234567890
    }
  }
}
```

---

## 6. Channel Output Format

Channels format responses according to platform requirements.

### Telegram Output

```typescript
interface TelegramOutput {
  text: string;
  parse_mode?: "Markdown" | "HTML";
  reply_to_message_id?: number;
  disable_web_page_preview?: boolean;
}
```

### Discord Output

```typescript
interface DiscordOutput {
  content: string;
  message_reference?: {
    message_id: string;
    channel_id: string;
  };
}
```

### WhatsApp Output

```typescript
interface WhatsAppOutput {
  text: string;
  quoted?: {
    key: { remoteJid: string; id: string };
  };
}
```

---

## Format Transformations

| Stage | Input Format | Output Format | Transformer |
|-------|--------------|---------------|-------------|
| Channel ingestion | Platform native | OpenClaw message | Channel plugin |
| Agent execution | OpenClaw message | Agent session message | Context builder |
| Persistence | Agent session message | JSONL turn | Session manager |
| Response delivery | Agent session message | Platform output | Channel plugin |

---

## Validation

All formats are validated using JSON Schema:

- **Gateway methods**: [`src/gateway/server-methods/*.ts`](../../src/gateway/server-methods/)
- **Channel messages**: Per-channel validation
- **Session messages**: Agent runtime validation

---

## References

| Topic | Location |
|-------|----------|
| OpenClaw message type | [`src/channels/dock.ts:40`](../../src/channels/dock.ts#L40) |
| Agent session message | [`src/sessions/types.ts`](../../src/sessions/types.ts) |
| Session persistence | [`src/config/sessions.js`](../../src/config/sessions.js) |
| Gateway protocol | [`src/gateway/server-ws-runtime.ts`](../../src/gateway/server-ws-runtime.ts) |
