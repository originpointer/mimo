# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mimo is a gold price real-time monitoring and decision support system built with a browser extension for data collection, a Next.js web app for visualization, and a Nitro backend service.

## Tech Stack

- **Package Manager**: Bun 1.3.10
- **Monorepo**: Turborepo 2.8.17
- **Language**: TypeScript 5.x

## Project Structure

```
mimo/
├── apps/
│   ├── mimo-app/              # Next.js 16 + React 19 + TailwindCSS v4
│   ├── mimo-browser-extension/ # Plasmo 0.90.5 + React 18
│   └── mimo-server/           # Nitro backend service
├── packages/
│   └── shared/                # Shared types and utilities (to be created)
├── package.json
└── turbo.json
```

## Apps

### mimo-app (Web Frontend)
- Framework: Next.js 16.1.7 with App Router
- UI: React 19.2.3 + TailwindCSS v4
- Charts: lightweight-charts (TradingView)
- Components: shadcn/ui
- Entry: `apps/mimo-app/app/page.tsx`

### mimo-browser-extension (Chrome Extension)
- Framework: Plasmo 0.90.5
- UI: React 18.2.0
- Target page: https://cn.investing.com/commodities/gold
- Entry: `apps/mimo-browser-extension/popup.tsx`

### mimo-server (Backend API)
- Framework: Nitro
- Features: Socket.io server, REST API
- Entry: `apps/mimo-server/server/`

## Commands

```bash
# Install dependencies
bun install

# Run all apps in development mode
bun dev

# Build all apps
bun build

# Run linting
bun lint

# Format code
bun format

# Type checking
bun check-types

# Run specific app
bun dev --filter=mimo-app
bun dev --filter=mimo-browser-extension
bun dev --filter=mimo-server
```

## Architecture

### Data Flow
```
investing.com → Browser Extension → Socket.io → Backend → Database
                                                       ↓
                                                 Web App (Next.js)
```

### Shared Package (planned)
The `packages/shared` directory will contain:
- TypeScript type definitions (Price, Alert, User, API responses)
- Socket.io event types
- Shared utilities

## Development Notes

- React versions differ between apps (mimo-app uses React 19, mimo-browser-extension uses React 18). This is intentional due to Plasmo compatibility requirements.
- Each app builds independently and can be deployed separately.
- Use `--filter` flag to target specific apps in turbo commands.
