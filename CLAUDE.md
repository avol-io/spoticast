# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Spoticast is an installable PWA that acts as a Pocket Casts–style client for Spotify podcasts. It is a React 19 single-page app in an **Nx standalone workspace** (one project, `spoticast`, rooted at the repo root — no `apps/` or `libs/` folders). The bundler is Vite (with `vite-plugin-pwa`), styling uses Tailwind CSS v4, routing uses React Router 6 data routers, tests run on Vitest with jsdom, and Storybook 10 is configured. There is no backend: Spotify auth is OAuth PKCE in the browser, and the app is deployed statically to GitHub Pages.

## Commands

Every task is an Nx target, run with `npx nx <target> spoticast` (or just `npx nx <target>`, since `spoticast` is the default project). `project.json` defines no targets: Nx plugins in `nx.json` infer them from `vite.config.mts`, `eslint.config.mjs` and `.storybook/`. To list them, run `npx nx show project spoticast`.

| Task                                    | Command                                          |
| --------------------------------------- | ------------------------------------------------ |
| Dev server (http://127.0.0.1:4200)      | `npx nx serve`                                   |
| Production build (to `dist/spoticast`)  | `npx nx build`                                   |
| Preview build (port 4300)               | `npx nx preview`                                 |
| Lint (`eslint ./src`)                   | `npx nx lint`                                    |
| Type-check (`tsc -p tsconfig.app.json`) | `npx nx typecheck`                               |
| Unit tests                              | `npx nx test`                                    |
| Single test file                        | `npx vitest run src/app/app.spec.tsx`            |
| Single test by name                     | `npx vitest run -t "should render successfully"` |
| Storybook (port 6006)                   | `npx nx storybook`                               |
| Format / check formatting               | `npm run format` / `npm run format:check`        |

- `vite.config.mts` sets `watch: false`, so `nx test` runs once and exits.
- Tests are collected from `{src,tests}/**/*.{test,spec}.*`, with Vitest globals (`describe`, `it`, `expect`) on. `src/test-setup.ts` loads jest-dom matchers and i18n, stubs `matchMedia` and clears localStorage after each test. Components that use router hooks or `<Link>` must be rendered inside `<MemoryRouter>` (or `createMemoryRouter` + `RouterProvider` for data-router APIs) in tests.
- i18n defaults to the browser language; jsdom reports `en-US`, so tests assert on English strings.
- Storybook picks up stories under `src/**` (`.storybook/main.ts`) and reuses `vite.config.mts`.

## Structure and conventions

- Entry: `src/main.tsx` mounts `<App>` in `StrictMode`. `src/app/app.tsx` applies theme/language preferences and renders a `RouterProvider`. Routes are declared in `src/app/router.tsx` (`createBrowserRouter`, with `basename` taken from Vite's `BASE_URL`); a data router is required for `<Link viewTransition>`.
- Layout:
  - `src/app/shell/`: app shell (bottom nav on mobile, sidebar from `lg`).
  - `src/app/ui/`: shared UI primitives.
  - `src/features/<area>/`: pages and feature components.
  - `src/lib/spotify/`: Web API client and PKCE auth.
  - `src/lib/storage/`: zustand stores persisted to localStorage under `spoticast.*` keys.
  - `src/i18n/`: typed `en`/`it` dictionaries; `en.ts` is the source of truth for keys.
- Theming: color tokens are CSS variables in `src/styles.css`, exposed to Tailwind via `@theme inline` (`bg-surface`, `text-fg-muted`, `bg-brand`, …). Use them instead of raw colors. `data-theme` on `<html>` switches dark/light. `--accent` is overridden per screen with the cover's dominant color.
- Spotify Web API: it follows the February 2026 Development Mode rules. Library writes go through `PUT`/`DELETE /me/library`, playlist contents through `/playlists/{id}/items`, search returns at most 10 results per page, and there are no batch fetch endpoints.
- Environment: copy `.env.example` to `.env` and set `VITE_SPOTIFY_CLIENT_ID`. `VITE_BASE` sets the deploy base path (`/<repo>/` on GitHub Pages). Spotify rejects `localhost` redirect URIs, so the dev server runs on `127.0.0.1`.
- Playback and Up Next:
  - Up Next is the user's private Spotify playlist "Spoticast". It is found or created by `ensureQueuePlaylist()` and edited only through the serialized helpers in `src/features/queue/queue.ts`, which update the cache optimistically and roll back on errors.
  - Episodes are played as that playlist's context, so the queue keeps going after the current episode. Issue playback commands only through `src/features/player/player-controller.ts`, which covers both the Web Playback SDK (this browser) and Spotify Connect (other devices).
- PWA icons are generated from `public/logo.svg` with `npx pwa-assets-generator` (`pwa-assets.config.ts`).
- Tailwind v4 is loaded through the `@tailwindcss/vite` plugin and `@import 'tailwindcss'` in `src/styles.css`. There is no `tailwind.config.*` file; Tailwind v4 is configured in CSS. CSS modules (`*.module.css`) are also supported.
- New React code should come from the Nx generators (`npx nx g @nx/react:component`, `@nx/react:lib`). Styling is Tailwind, so pass `--style=none` (e.g. `npx nx g @nx/react:component src/features/home/show-card --style=none --no-interactive`). Generated files are kebab-case with a colocated `.spec.tsx`.
- Prettier style: single quotes, semicolons, trailing commas everywhere.
- Commits follow Conventional Commits (commitizen with `cz-conventional-changelog` is configured, e.g. `feat: ...`).

## Environment

The repo is developed in a devcontainer (Node 24). `node_modules` and the Playwright browser cache live in Docker volumes. The container sets `NX_DAEMON=true` and `NX_NO_CLOUD=true`, so Nx Cloud is not used.
