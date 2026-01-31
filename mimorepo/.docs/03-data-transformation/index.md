# Data Transformation

This section describes the data formats and transformations that occur as messages flow through OpenClaw.

## Overview

OpenClaw transforms data through multiple formats:

| Format | Stage | Description |
|--------|-------|-------------|
| **Channel native** | Ingestion | Platform-specific message format |
| **OpenClaw message** | Gateway | Normalized internal format |
| **Agent session** | Execution | Format passed to LLM |
| **Session transcript** | Persistence | JSONL storage format |
| **Channel output** | Delivery | Platform-specific reply format |

## Documents

| Document | Description |
|----------|-------------|
| **[Message Formats](./message-formats.md)** | Input/output message schemas |
| **[Session Data](./session-data.md)** | Session state and persistence |
| **[Media Pipeline](./media-pipeline.md)** | Image/audio/video processing |
| **[Context Building](./context-building.md)** | How context is assembled |
| **[Tool Results](./tool-results.md)** | Tool execution result handling |
| **[Transcription Hooks](./transcription-hooks.md)** | Audio transcription pipeline |

## Data Transformation Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         CHANNEL NATIVE FORMAT                              │
│  { platform: { from, to, text, media, ... }, platformSpecificFields }      │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         OPENCLAW MESSAGE FORMAT                            │
│  { From, To, ChatType, Text, MediaUrl, ReplyToId, Timestamp }              │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         AGENT SESSION MESSAGE                              │
│  { role: "user"|"assistant"|"tool"|"system", content: [...], metadata }     │
└────────────────────────────────────┬───────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         SESSION TRANSCRIPT (JSONL)                         │
│  { role, content, timestamp, toolCall, toolResult, mediaUrls, ... }        │
└────────────────────────────────────────────────────────────────────────────┘
```

## Key Transformations

| Transformation | Input | Output | Location |
|----------------|-------|--------|----------|
| **Channel normalization** | Platform-specific | OpenClaw message | [`src/channels/*/normalize.ts`](../../src/channels/) |
| **Session key building** | Route params | `agent:{id}:{channel}:{kind}:{peerId}` | [`src/routing/session-key.ts:110`](../../src/routing/session-key.ts#L110) |
| **Context assembly** | History + skills | Prompt context | [`src/agents/context.ts`](../../src/agents/) |
| **Tool result formatting** | Tool output | Markdown/text | [`src/auto-reply/tool-meta.ts`](../../src/auto-reply/tool-meta.ts) |
| **Block streaming** | Delta stream | Coalesced chunks | [`src/agents/pi-embedded-block-chunker.ts`](../../src/agents/pi-embedded-block-chunker.ts) |
| **Reply directive parsing** | Raw text | Extracted commands | [`src/auto-reply/reply/reply-directives.ts`](../../src/auto-reply/reply/reply-directives.ts) |

## Quick Reference

| Question | Answer |
|----------|--------|
| **What is the internal message format?** | See [Message Formats](./message-formats.md) |
| **Where are sessions stored?** | `~/.openclaw/agents/{agentId}/sessions/*.jsonl` |
| **How are media files handled?** | See [Media Pipeline](./media-pipeline.md) |
| **How is context assembled?** | See [Context Building](./context-building.md) |
| **How are tool results formatted?** | See [Tool Results](./tool-results.md) |
