# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TraveLLM is a Next.js 16.1 (App Router) AI travel planner. See `CLAUDE.md` for full architecture, project structure, and env var documentation.

### Dev environment

- **Package manager**: npm (lockfile: `package-lock.json`). Use `npm ci --include=dev` to install, since `NODE_ENV=production` is injected by the cloud VM and causes `npm ci` alone to skip devDependencies (eslint, typescript, etc.).
- **Dev server**: `npm run dev` (port 3000, Turbopack). All required secrets are injected as environment variables by the cloud VM.
- `.env.local` should contain only dev convenience flags: `TRAVELLM_DEV_SKIP_PROXY_AUTH=1` (skip auth guards in proxy.ts) and `TRAVELLM_LIMIT_FAIL_OPEN=1` (don't block on missing limits DB). These are not secrets.
- **Lint**: `NODE_ENV=development npx eslint .` (the `npm run lint` script resolves to `eslint .` but the binary isn't on PATH; use npx or the full path `./node_modules/.bin/eslint`). Alternatively override NODE_ENV inline.
- **Build**: `npm run build` — must run with default `NODE_ENV=production` (Next.js warns on non-standard values). Build output is `standalone`.
- **TypeScript check**: `npm run typecheck` (`tsc --noEmit`).

### Key caveats

- `proxy.ts` is the Next.js 16 middleware replacement. Both `proxy.ts` and `middleware.ts` cannot coexist.
- The app uses Supabase (hosted, no local DB). All database access goes through the Supabase JS client or service role key.
- AI features require `OPENROUTER_API_KEY` (primary) and optionally `DEEPSEEK_API_KEY` (fallback). Without them, AI route generation returns errors but the rest of the app still renders.
- `ignoreBuildErrors` in `next.config.mjs` may toggle between `true`/`false` across branches; check before relying on TS strictness in builds.
