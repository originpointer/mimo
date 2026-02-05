# Repository Guidelines

## Project Structure & Module Organization

- `apps/web/`: Next.js app (App Router) on port `3000` (`app/`, `public/`).
- `apps/docs/`: Next.js app on port `3001` (`app/`, `public/`).
- `packages/ui/`: shared React UI components in `src/` (import as `@repo/ui/<component>`, e.g. `@repo/ui/button`).
- `packages/eslint-config/`: shared ESLint flat configs (e.g. `@repo/eslint-config/next-js`).
- `packages/typescript-config/`: shared `tsconfig` presets used across the monorepo.

## Build, Test, and Development Commands

- Install deps (repo root): `pnpm install`
- Run all dev tasks: `pnpm dev` (Turbo orchestrates; `web` at `http://localhost:3000`, `docs` at `http://localhost:3001`)
- Build everything: `pnpm build`
- Lint all workspaces: `pnpm lint` (fails on warnings)
- Typecheck all workspaces: `pnpm check-types`
- Format TS/TSX/MD: `pnpm format`
- Run a single workspace: `pnpm --filter web dev` (swap `web` for `docs` or `@repo/ui`)

## Coding Style & Naming Conventions

- TypeScript is `strict`; keep types explicit at module boundaries.
- Formatting is enforced with Prettier (run `pnpm format` before pushing).
- React components use `PascalCase` names; follow existing file patterns (e.g. `packages/ui/src/button.tsx`).

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
