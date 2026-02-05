# Repository Guidelines

## Project Structure & Module Organization

- `packages/mimo-utils/`: shared TypeScript utilities (isomorphic, Node + browser).

## Build, Test, and Development Commands

- Install deps (repo root): `pnpm install`
- Lint all workspaces: `pnpm lint` (fails on warnings)
- Typecheck all workspaces: `pnpm check-types`
- Format TS/TSX/MD: `pnpm format`
- Run a single workspace: `pnpm --filter @repo/mimo-utils lint` (swap script as needed)

## Coding Style & Naming Conventions

- TypeScript is `strict`; keep types explicit at module boundaries.
- Formatting is enforced with Prettier (run `pnpm format` before pushing).
- Keep public utilities small and composable.

## Testing Guidelines

- No standalone unit test runner is configured yet; treat `pnpm lint` + `pnpm check-types` as required checks.
- If adding tests, prefer `*.test.ts(x)` (or `__tests__/`) and add a `test` script so Turbo can run `turbo run test`.

## Commit & Pull Request Guidelines

- Prefer Conventional Commit-style subjects seen in history: `feat:`, `fix:`, `chore:`, `refactor:` (optional scope like `feat(ui): ...`).
- PRs: include a clear description, link issues (if any), and add screenshots for UI changes.
- Before requesting review, ensure `pnpm lint` and `pnpm check-types` pass.

## Security & Configuration Tips

- Use `.env.local` for secrets and do not commit `.env*` files.
- Turbo treats `.env*` as task inputs (see `turbo.json`); changes may invalidate caches.
