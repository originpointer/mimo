# mimocrx

Chrome extension (Plasmo, MV3) for Turbo Mimo MVP.

It provides:
- Socket.IO plugin client (namespace: `/mimo`, event: `plugin_message`)
- Plugin activation handshake (`activate_extension`)
- Executes `browser_action` from the server (minimal MVP implementation)

## Run (development)

From `turbo/`:

```sh
pnpm --filter mimocrx dev
```

Then load the extension into Chrome from Plasmo's dev output (Plasmo will print the path).

## Environment variables

Plasmo uses `PLASMO_PUBLIC_*` as build-time env vars.

- `PLASMO_PUBLIC_MIMO_SERVER_URL` - server base URL (default: `http://localhost:6006`)

Example:

```env
PLASMO_PUBLIC_MIMO_SERVER_URL=http://localhost:6006
```

## Notes

- This MVP stub currently implements only a minimal set of actions (tab creation, wait loaded, screenshot upload, etc.).
- For full fidelity (CDP, readability, DOM index, xpath scan), we should port the richer executor from `mimorepo/apps/plasmo-app`.
