# mimoserver

Nitro-based backend for Turbo Mimo MVP.

It provides:
- HTTP APIs under `/api/*` (tasks, snapshot, extensions, artifacts)
- Socket.IO bus on the same server/port (namespace: `/mimo`)
- Minimal agent loop (streaming text via ai-gateway)

## Run

From `turbo/`:

```sh
pnpm --filter mimoserver dev
```

By default it should listen on `http://localhost:6006`.

## Environment variables

Create `turbo/apps/mimoserver/.env` (or export env vars in your shell):

Required for LLM streaming:
- `MIMO_AI_GATEWAY_KEY` - ai-gateway API key
- `MIMO_AI_MODEL` - model id, e.g. `openai/gpt-4o-mini`

Optional:
- `PORT` - server port (default: `6006`)
- `MIMO_BASE_URL` - used to construct artifact upload/download URLs (default: `http://localhost:6006`)
- `MIMO_SNAPSHOT_DEBUG` - enable snapshot logging (`1`/`true` to enable)
- `MIMO_CORS_ORIGIN` - comma-separated allowed origins for Socket.IO/HTTP CORS (default: `http://localhost:3000,http://127.0.0.1:3000`)

Example:

```env
PORT=6006
MIMO_AI_GATEWAY_KEY=your_key_here
MIMO_AI_MODEL=openai/gpt-4o-mini
MIMO_BASE_URL=http://localhost:6006
MIMO_SNAPSHOT_DEBUG=1
MIMO_CORS_ORIGIN=http://localhost:3000
```

## Key endpoints

- `GET /api/task/id`
- `GET /api/task/list`
- `GET /api/task/:taskId`
- `GET /api/snapshot`
- `GET /api/extension/extension-list`
- `POST /api/artifacts/presign`
- `POST /api/artifacts/:artifactId/upload`
- `GET /api/artifacts/:artifactId`
