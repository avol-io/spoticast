# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Spoticast is an installable PWA that acts as a client for Spotify podcasts. It is a React 19 single-page app in an **Nx standalone workspace** (one project, `spoticast`, rooted at the repo root — no `apps/` or `libs/` folders). The bundler is Vite (with `vite-plugin-pwa`), styling uses Tailwind CSS v4, routing uses React Router 6 data routers, tests run on Vitest with jsdom, and Storybook 10 is configured. There is no backend: Spotify auth is OAuth PKCE in the browser, and the app is deployed as static files: production over FTP to tophost.it (Apache), the beta to GitHub Pages.

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
- Storybook picks up stories under `src/**` (`.storybook/main.ts`) and reuses `vite.config.mts` without the PWA and `.htaccess` plugins. `.storybook/preview.tsx` provides i18n, styles, a router, a QueryClient, and theme/language toolbar switches. Seed zustand stores in a story's `beforeEach`.

## Structure and conventions

- Entry: `src/main.tsx` mounts `<App>` in `StrictMode`. `src/app/app.tsx` applies theme/language preferences and renders a `RouterProvider`. Routes are declared in `src/app/router.tsx` (`createBrowserRouter`, with `basename` taken from Vite's `BASE_URL`); a data router is required for `<Link viewTransition>`. Every page except the home is code-split with the route `lazy` option, and `RouteError` reloads once when a deploy removed an old chunk.
- Layout:
  - `src/app/shell/`: app shell (bottom nav on mobile, sidebar from `lg`).
  - `src/app/ui/`: shared UI primitives.
  - `src/features/<area>/`: pages and feature components.
  - `src/lib/spotify/`: Web API client and PKCE auth.
  - `src/lib/storage/`: zustand stores persisted to localStorage under `spoticast.*` keys.
  - `src/i18n/`: typed `en`/`it` dictionaries; `en.ts` is the source of truth for keys.
- Theming: color tokens are CSS variables in `src/styles.css`, exposed to Tailwind via `@theme inline` (`bg-surface`, `text-fg-muted`, `bg-brand`, …). Use them instead of raw colors. `data-theme` on `<html>` switches dark/light. `--accent` is overridden per screen with the cover's dominant color. Use `text-accent-ink` (not `text-accent`) for text tinted with it: it is mixed towards white or black for contrast. Colors are checked with axe in both themes, so keep text tokens at 4.5:1 or more.
- Spotify Web API: it follows the February 2026 Development Mode rules. Library writes go through `PUT`/`DELETE /me/library`, playlist contents through `/playlists/{id}/items`, search returns at most 10 results per page, and there are no batch fetch endpoints.
- Environment: copy `.env.example` to `.env` and set `VITE_SPOTIFY_CLIENT_ID`. `VITE_BASE` sets the deploy base path (default `/`). Spotify rejects `localhost` redirect URIs, so the dev server runs on `127.0.0.1`.
- Deploy (`.github/workflows/`):
  - `ci.yml` (push to `main`, pull requests, and called by `beta.yml`) checks formatting, lint, types, tests and the build. It never deploys.
  - `beta.yml` (push to `develop`, or by hand on `develop`) runs `ci.yml`, tags the commit with the next `vX.Y.Z-beta.N` (minor after the latest `vX.Y.Z` tag, or the `NEXT_VERSION` variable when higher; N per base) and calls `deploy.yml` with the commits since the previous tag as release URL. No GitHub Release is created.
  - `deploy.yml` deploys a tag: on a published release, when called by `beta.yml`, or by hand. `vX.Y.Z-beta.N` goes to the beta channel on GitHub Pages (`https://www.avol.io/spoticast/`, the account's custom Pages domain, base `/spoticast/`), `vX.Y.Z` to production over FTP (site root). For releases it checks that the tag matches the pre-release flag. It builds with `VITE_CHANNEL`, `APP_VERSION` (the tag) and `APP_RELEASE_URL`. Production uploads only the changed files and excludes `charts/`. The beta downloads a charts snapshot before the build, copies `index.html` to `404.html` (the SPA fallback on Pages) and drops `.htaccess`.
  - `charts.yml` (daily) runs `scripts/fetch-charts.mjs` and uploads only `public/charts/` to `charts/` on the FTP server, without building.
  - The build writes an Apache `.htaccess` (SPA fallback, HTTPS, caching) from `vite.config.mts`.
  - `public/charts/` is gitignored. Run `npm run charts` (optionally `npm run charts -- it us`) to get chart data locally.
- Channels and versions:
  - `VITE_CHANNEL=beta` builds the beta: "Spoticast Beta" manifest and title, `noindex`, icons from `public/icons-beta/` (regenerate with `npx pwa-assets-generator --config pwa-assets-beta.config.ts`), a Beta badge and "Spoticast Beta" as the Connect device name. The Connect name carries the device in brackets ("Spoticast Beta (iPhone)"): the kind from the user agent (`src/lib/device-name.ts`), or the name set in the settings, applied at the next start. Read the channel from `src/lib/build-info.ts` (`IS_BETA`, `APP_BUILD`, `LOGO_URL`), never from `__APP_BUILD__` directly.
  - The build writes `version.json` (version, sha, date, channel, release URL). When a new service worker is waiting, `src/lib/pwa/update.ts` reads it to name the new version.
  - The beta is a separate origin (GitHub Pages), so its local data is separate, but it shares the Spotify Up Next and smart playlists with production.
- Playback and Up Next:
  - Up Next is the user's private Spotify playlist "Spoticast". It is found or created by `ensureQueuePlaylist()` and edited only through the serialized helpers in `src/features/queue/queue.ts`, which update the cache optimistically and roll back on errors.
  - Episodes are played as that playlist's context, so the queue keeps going after the current episode. Issue playback commands only through `src/features/player/player-controller.ts`, which covers both the Web Playback SDK (this browser) and Spotify Connect (other devices).
  - A device keeps the Up Next order it loaded with the context. `player-controller.ts` watches the queue cache and starts the context again on the current episode when the next one changed (at once while playing, on resume when paused) or at the next episode change for edits further down (`src/features/queue/queue-sync.ts`).
  - Up Next only holds what is left: the episode the device moves on from (end, or skipped elsewhere) leaves it, except when the move is a start of ours; finished, archived and passed episodes are pruned at startup and on return. "Clear Up Next" removes every episode without archiving.
  - Back from the background (`src/lib/pwa/foreground.ts`: `visibilitychange`, `pageshow`, `online`) nothing has run meanwhile. `resumeSync()` refreshes the token, reconnects the SDK when Spotify no longer lists it (iOS drops it silently; it comes back with a new device id), polls the API (local state is trusted only while the SDK reports one) and refreshes devices and Up Next. React Query refetches on focus only after the token is ready, smart playlists rebuild if the last run is 30+ minutes old. Commands that get a 404 for their device go through `onLiveDevice()`, which recovers a live device and retries once.
  - The mini player is always visible (what plays, else the head of Up Next) and picks the device. Playback starts where something is loaded, else on the preferred device in the settings store (`preferredDevice`: this browser, or a Connect device matched by id then name). The default is this browser, else the first phone (`pickPlaybackDevice()` in `playback.ts`).
  - Local player vs external device: every playback feature has two behaviors, one for this browser (Web Playback SDK, `nowPlaying.isLocal`) and one for another Spotify Connect device (Web API only, and the app may be closed while it plays). Branch with `onTarget()` in `player-controller.ts`, cover both cases in tests, and when a request touches playback, state how each case behaves (ask if unclear).
- Episode lists: wrap each row in `EpisodeSwipeRow` (`src/features/podcast/`, built on `src/app/ui/swipe-row.tsx`): swiping left reveals play next / play last / archive (plus remove in Up Next and in manual playlists), and press-and-hold starts a selection. Register the list with `useSelectableList()` (`src/features/selection/`): the shell then swaps the bottom nav for `SelectionBar` with the bulk actions. Swipes and long presses are shortcuts: keep every action in the row menu and a "Select" entry in the page.
- Archive and filters:
  - "Archived" = `fully_played` on Spotify, or archived and waiting for the silent-completion sync (`src/features/archive/`). Use `useIsArchived()` rather than reading `resume_point` directly.
  - The archive waiting for that sync is shared through the private playlist "Spoticast · Archive" (found by the `sca1` marker in its description): `archive-playlist.ts` writes local changes shortly after they happen and `syncArchive()` reads it back at startup and on return to the foreground. The `pending` store mirrors it (`sharedAt: null` = not written yet, `removed` = removals not written yet); attempts and "restored" stay per device. Any idle Spoticast tab with the SDK can complete an episode archived on another device.
  - Per-podcast filters and smart playlists (called smart lists in the code, under `/playlists`) share the pure matcher in `src/lib/filters/engine.ts`.
  - Manual playlists (`src/features/filters/manual-playlists.ts`, under `/playlists/m/:id`) live only on Spotify: playlists the user owns, named `Spoticast - <name>`, with the `scm1` marker in the description (smart playlists use `sc1:`). Episodes go in through "Add to playlist…" (row menu and selection bar); the app no longer uses "Your Episodes".
- Diagnostics (beta and dev only, `DIAG_ENABLED` in `src/lib/diagnostics/config.ts`; off in production):
  - `diag(area, event, data)` from `src/lib/diagnostics/log.ts` records key events (SDK, player state, commands with their `onTarget` branch, Up Next writes, resume steps, page lifecycle, API errors and retries, toasts). It keeps the last `VITE_DIAG_WINDOW_SECONDS` (default 60) in localStorage (`spoticast.diag`), so the log survives a reload or iOS killing the app. Log new playback paths with it; never log tokens, search queries or full titles (use `shortId`, `shortDevice`, `shortName`).
  - "Report a problem" (Settings, the full player, and the action on error toasts) opens `src/features/feedback/feedback-sheet.tsx`. It freezes the log and a state snapshot (`snapshot.ts`), then sends them with the user's description as a `mailto:` to spoticast@avol.io. Past `VITE_DIAG_MAX_CHARS` (default 16000) the oldest events are cut from the body; "Copy log" copies the whole report as JSON.
- PWA icons are generated from `public/logo.svg` with `npx pwa-assets-generator` (`pwa-assets.config.ts`).
- Tailwind v4 is loaded through the `@tailwindcss/vite` plugin and `@import 'tailwindcss'` in `src/styles.css`. There is no `tailwind.config.*` file; Tailwind v4 is configured in CSS. CSS modules (`*.module.css`) are also supported.
- New React code should come from the Nx generators (`npx nx g @nx/react:component`, `@nx/react:lib`). Styling is Tailwind, so pass `--style=none` (e.g. `npx nx g @nx/react:component src/features/home/show-card --style=none --no-interactive`). Generated files are kebab-case with a colocated `.spec.tsx`.
- Prettier style: single quotes, semicolons, trailing commas everywhere.
- Commits follow Conventional Commits (commitizen with `cz-conventional-changelog` is configured, e.g. `feat: ...`).
- Branches: day-to-day work goes to `develop`, and every push there publishes a beta. `main` holds what is released to production.

## Environment

The repo is developed in a devcontainer (Node 24). `node_modules` and the Playwright browser cache live in Docker volumes. The container sets `NX_DAEMON=true` and `NX_NO_CLOUD=true`, so Nx Cloud is not used.
