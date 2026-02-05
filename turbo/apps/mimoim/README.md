# mimoim

Next.js web UI for Turbo Mimo MVP.

It provides:
- Chat UI (sends `user_message`, renders `chatDelta`)
- Snapshot view (initial load via `GET /api/snapshot`, realtime via `snapshotSync`)

## Run

Start the server first:

```sh
pnpm --filter mimoserver dev
```

Then run the web app (from `turbo/`):

```sh
pnpm --filter mimoim dev
```

Open `http://localhost:3000`.

## Environment variables

Create `turbo/apps/mimoim/.env.local`:

- `NEXT_PUBLIC_MIMO_ENABLED` - set `true` to enable socket connection
- `NEXT_PUBLIC_MIMO_SERVER_URL` - server base URL (default: `http://localhost:6006`)

Example:

```env
NEXT_PUBLIC_MIMO_ENABLED=true
NEXT_PUBLIC_MIMO_SERVER_URL=http://localhost:6006
```

## Notes

- `next.config.ts` rewrites `/api/*` to `http://localhost:6006/api/*` for local dev.
