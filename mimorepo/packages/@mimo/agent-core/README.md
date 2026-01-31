# @mimo/agent-core

> Foundation types, interfaces, and utilities for the Mimo Agent system

[![npm version](https://badge.fury.io/js/%40mimo%2Fagent-core.svg)](https://www.npmjs.com/package/@mimo/agent-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

`@mimo/agent-core` is the foundational package for the Mimo Agent system. It provides:

- **Type Definitions**: Complete TypeScript types for LLM interactions, messages, tools, agents, caching, Socket.IO, and browser operations
- **Core Interfaces**: Abstract interfaces for LLM clients, tool registries, cache providers, agents, and message buses
- **Schema Utilities**: Schema optimizer for OpenAI strict mode compatibility with runtime validation
- **Constants**: Model configurations and default values
- **Utilities**: UUID generation and logging utilities

## Installation

```bash
npm install @mimo/agent-core
# or
pnpm add @mimo/agent-core
# or
yarn add @mimo/agent-core
```

## Package Exports

```typescript
// Main entry point
import { Role, BaseMessage, ToolCall } from '@mimo/agent-core';

// Sub-exports
import types from '@mimo/agent-core/types';
import interfaces from '@mimo/agent-core/interfaces';
import schemas from '@mimo/agent-core/schemas';
import constants from '@mimo/agent-core/constants';
import utils from '@mimo/agent-core/utils';
```

## Features

### Types (`/types`)

Comprehensive TypeScript definitions for:

- **LLM Types**: `LLMRequestOptions`, `LLMResponse`, `TokenUsage`
- **Message Types**: `BaseMessage`, `UserMessage`, `AssistantMessage`, `ToolMessage`, `SystemMessage`
- **Tool Types**: `Tool`, `ToolCall`, `ToolResult`
- **Agent Types**: `Agent`, `AgentConfig`, `AgentState`
- **Cache Types**: `CacheEntry`, `CacheOptions`
- **Socket.IO Types**: Socket message types compatible with Manus.im
- **Browser Types**: Browser operation types

```typescript
import { Role, type BaseMessage, type ToolCall } from '@mimo/agent-core/types';

const message: BaseMessage = {
  role: Role.USER,
  content: 'Hello, how can you help me?'
};

const toolCall: ToolCall = {
  id: 'call_123',
  name: 'search',
  parameters: { query: 'weather today' }
};
```

### Interfaces (`/interfaces`)

Abstract interfaces for implementing core components:

- `ILLMClient`: LLM provider client interface
- `IToolRegistry`: Tool registration and discovery
- `ICacheProvider`: Caching layer interface
- `IAgent`: Agent execution interface
- `IMessageBus`: Message passing interface

```typescript
import type { ILLMClient, LLMRequestOptions, LLMResponse } from '@mimo/agent-core/interfaces';

class MyLLMClient implements ILLMClient {
  async chat(messages: BaseMessage[], options?: LLMRequestOptions): Promise<LLMResponse> {
    // Implementation
  }
}
```

### Schemas (`/schemas`)

Schema optimization and validation utilities:

- **SchemaOptimizer**: Optimize Zod schemas for OpenAI strict mode
- **SchemaValidator**: Runtime validation with Zod
- **JsonSchemaValidator**: JSON Schema validation
- **TypeGuards**: TypeScript type guards

```typescript
import { z } from 'zod';
import { SchemaOptimizer, SchemaValidator } from '@mimo/agent-core/schemas';

// Define schema
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

// Optimize for OpenAI strict mode
const jsonSchema = SchemaOptimizer.optimizeStrict(UserSchema);

// Runtime validation
const result = SchemaValidator.validate(UserSchema, userInput);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.errors);
}
```

### Constants (`/constants`)

Pre-defined configurations:

- **Model Constants**: Supported model names and providers
- **Default Configurations**: Default timeouts, retry counts, etc.
- **Error Messages**: Standardized error messages

```typescript
import { ModelName, DEFAULT_TIMEOUT } from '@mimo/agent-core/constants';

const config = {
  model: ModelName.GPT4O,
  timeout: DEFAULT_TIMEOUT
};
```

### Utils (`/utils`)

Utility functions:

- **UUID Generation**: `generateUUID()`, `generateNanoId()`
- **UUID Validation**: `isValidUUID()`, `validateUUID()`
- **Logging**: Structured logger with log levels

```typescript
import { generateUUID, generateNanoId, createLogger } from '@mimo/agent-core/utils';

const uuid = generateUUID();
const nanoId = generateNanoId(21);
const logger = createLogger('MyModule');

logger.info('Process started', { id: uuid });
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm check-types

# Lint
pnpm lint
```

## Requirements

- Node.js >= 18
- TypeScript 5.9+

## License

MIT © Mimo Team

## Related Packages

- `@mimo/agent-llm` - LLM provider implementations
- `@mimo/agent-tools` - Built-in tool collection
- `@mimo/agent-browser` - Browser automation tools
