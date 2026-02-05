# docs

Next.js docs site for Turbo Mimo.

It renders markdown files from `turbo/docs/**`:
- Index page lists all `.md` files
- `/docs/[...slug]` renders a specific markdown file

## Run

From `turbo/`:

```sh
pnpm --filter docs dev
```

Open `http://localhost:6060`.

## Environment variables

None required.
