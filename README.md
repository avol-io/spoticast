# Spoticast

Spoticast is a Pocket Casts–style client for your **Spotify podcasts**. It is an installable PWA, designed for mobile first and laid out for desktop too. It runs entirely in the browser: there is no backend, and it is deployed as static files.

## Features

- **Library**: a grid or list of the podcasts you follow. Badges count the episodes you haven't listened to yet. Sort by latest episode, by name, or in your own drag-and-drop order.
- **Podcast detail**: the cover morphs into the page (View Transition API) and the page takes its colors from the cover. Episodes are split into "To listen" and "Archived" tabs.
- **Archive**: archived = completed on Spotify, or archived in the app. Spotify has no API to mark an episode as played. Instead, when nothing is playing, Spoticast silently plays the last seconds of each archived episode in the browser at volume 0, then restores what you were listening to.
- **Filters**: each podcast has its own filter (duration, last N days, listening status, text), saved in the browser, plus reusable presets. **Smart filters** list episodes across your podcasts. Each one can optionally mirror into a `Spoticast - <name>` playlist on Spotify, rebuilt every time the app starts.
- **Up Next**: the queue is a private Spotify playlist called `Spoticast`. You can play next, play last, remove and reorder. Finished, archived or skipped episodes leave the queue, and the queue syncs across devices.
- **Player**: plays in the browser (Web Playback SDK) or controls your other devices through Spotify Connect. There's a mini player and a full-screen player with configurable skips, plus lock-screen controls (Media Session). Video podcasts open in the Spotify embed. "Continue in Spotify" hands playback over to the Spotify app.
- **Your Episodes**: save or remove a single episode, or mirror the whole queue into "Your Episodes".
- **Search**: podcasts and episodes. When the field is empty, it shows Spotify's **Trending / Top** podcast charts for your country.
- Italian and English UI, dark, light and system themes, works offline with cached data, and keyboard and screen-reader friendly (checked with axe).

## What Spotify doesn't allow

Spoticast follows the Web API rules for apps in **Development Mode**, which changed in February 2026:

- The app owner needs **Spotify Premium**, and at most **5 users** can log in. Add each user in the Spotify Developer Dashboard.
- Playback in the browser requires Premium. Video podcasts play audio-only in the SDK, so Spoticast shows the video through the Spotify embed instead.
- There is no API for ratings and comments (Spoticast links to the Spotify app instead), for playback speed, for downloads, or for editing the native queue.
- Search returns at most 10 results per page, and there are no batch endpoints.

## Spotify app setup

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app. Enable **Web API** and **Web Playback SDK**.
2. Add the redirect URIs:
   - `http://127.0.0.1:4200/callback` for development. Spotify rejects `localhost`, and the dev server automatically moves itself to `127.0.0.1`.
   - `https://<your-domain>/callback` for production, e.g. `https://spoticast.it/callback`.
3. Under **User Management**, add the Spotify email of every user who should be able to log in (max 5).
4. Copy the **Client ID**.

## Local development

Requirements: Node 24. A devcontainer is included.

```sh
npm ci
cp .env.example .env        # then set VITE_SPOTIFY_CLIENT_ID
npm run charts -- it us     # optional: chart data for the empty search
npx nx serve                # http://127.0.0.1:4200
```

| Task              | Command                                                     |
| ----------------- | ----------------------------------------------------------- |
| Unit tests        | `npx nx test`                                               |
| Lint / type-check | `npx nx lint` / `npx nx typecheck`                          |
| Production build  | `npx nx build` (output in `dist/spoticast`)                 |
| Preview the build | `npx nx preview` (http://127.0.0.1:4300)                    |
| Storybook         | `npx nx storybook` (http://localhost:6006)                  |
| Download charts   | `npm run charts` (all 26 markets) or `npm run charts -- it` |

## Deploy

The site has two channels, each installable as its own app:

| Channel    | URL                           | Hosting              | Published by                                  |
| ---------- | ----------------------------- | -------------------- | --------------------------------------------- |
| production | https://spoticast.it          | tophost.it, over FTP | a GitHub **release** `vX.Y.Z`                 |
| beta       | https://www.avol.io/spoticast | GitHub Pages         | every push to `develop` (tag `vX.Y.Z-beta.N`) |

GitHub Actions workflows check and publish the site. The FTP uploads send only what changed, and never run at the same time.

| Workflow     | When                                                            | What it does                                                                                                                                                                                                       |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`     | push to `main`, pull requests, called by `beta.yml`             | Checks formatting, runs lint, type-check, tests and the build. It never deploys.                                                                                                                                   |
| `deploy.yml` | a release is published, called by `beta.yml`, or manual (a tag) | Runs lint, type-check and tests on the tag and builds it for its channel. Production: uploads the changed files over FTP, never touching `charts/`. Beta: publishes to GitHub Pages with a snapshot of the charts. |
| `beta.yml`   | push to `develop` (not for `*.md` only)                         | Runs the `ci.yml` checks, tags the commit with the next `vX.Y.Z-beta.N` and deploys it with `deploy.yml`.                                                                                                          |
| `charts.yml` | every day at 05:17 UTC, or manual                               | Downloads the charts, then uploads only `public/charts/` to `charts/` on the FTP server. No build.                                                                                                                 |

### Releasing

**Beta (automatic).** Every push to `develop` that passes the checks is tagged `vX.Y.Z-beta.N` and deployed to the beta. No GitHub Release is created.

- `X.Y.Z` is the minor after the latest production release (`v1.0.0` → `1.1.0`), or `1.0.0` before the first one. For another version, e.g. a major, set the repository variable `NEXT_VERSION` (e.g. `2.0.0`): it is used while it is higher than the computed one.
- `N` counts up from 1 for each `X.Y.Z`. A failed check creates no tag, and a retried run reuses the commit's tag.
- Pushes that only change Markdown files publish nothing.

**Production (manual).**

1. Merge `develop` into `main`.
2. On GitHub, go to **Releases → Draft a new release**, create the tag `vX.Y.Z` on `main` (leave **Set as a pre-release** unticked) and click **Generate release notes**.
3. Publish. `deploy.yml` checks that the tag matches the pre-release flag, then deploys.

A pre-release `vX.Y.Z-beta.N` published by hand also goes to the beta. To redeploy a tag, run `deploy.yml` by hand with it.

The tag becomes the app version: Settings shows it with a link to the release notes (for automatic betas, the commits since the previous tag), and the update banner names the new version. Local builds show `git describe --tags` (or `dev` when there are no tags).

### Setup

In the repository, go to **Settings → Secrets and variables → Actions** and configure:

| Name                     | Type     | Value                                                                    |
| ------------------------ | -------- | ------------------------------------------------------------------------ |
| `FTP_SERVER`             | secret   | FTP host, e.g. `ftp.spoticast.it`                                        |
| `FTP_USERNAME`           | secret   | FTP user                                                                 |
| `FTP_PASSWORD`           | secret   | FTP password                                                             |
| `VITE_SPOTIFY_CLIENT_ID` | variable | Client ID of the Spotify app                                             |
| `FTP_SERVER_DIR`         | variable | Site folder on the server, ending with `/` (default `./`, e.g. `./www/`) |
| `FTP_PROTOCOL`           | variable | `ftps` (default) or `ftp` if the host has no FTP over TLS                |
| `VITE_BASE`              | variable | Path production is served from (default `/`)                             |
| `NEXT_VERSION`           | variable | Optional: base version of the automatic betas, e.g. `2.0.0`              |

Production deploys run in the GitHub environment `production`, created on the first deploy. To require an approval before they run, add **required reviewers** to it.

For the beta:

- In **Settings → Pages**, set **Source** to **GitHub Actions**.
- In **Settings → Environments → github-pages → Deployment branches and tags**, add a rule for the branch `develop` (automatic betas) and one for the tags `v*` (pre-releases and manual redeploys). By default only `main` can deploy to Pages.
- In the Spotify Dashboard, add `https://www.avol.io/spoticast/callback` as a redirect URI. The account's Pages sites use the custom domain `www.avol.io`: `avol-io.github.io/spoticast` redirects there.
- The beta is a separate site, so it has its own login and local data. It uses the same Spotify account data as production: the Up Next playlist and the smart filter playlists are shared.
- Its charts are a snapshot taken at deploy time. GitHub Pages caches files for about 10 minutes, so a new beta can take a few minutes to show up.

Notes:

- The build writes an Apache `.htaccess` file for production. It redirects to HTTPS, serves `index.html` for app routes, sets long caching for hashed assets and no caching for the shell, service worker, `version.json` and charts, and hides the FTP sync-state file. Login and installation both need HTTPS, so enable an SSL certificate on the hosting first. On GitHub Pages, a copy of `index.html` named `404.html` serves the app routes instead.
- The FTP deploy action keeps a `.ftp-deploy-sync-state.json` file on the server to know what changed. If you upload files by hand, delete that file so the next deploy uploads everything.
- Run the **charts** workflow once by hand after the first deploy. Until then, the empty search shows "charts not available".
- A tab still open on an older version reloads itself if one of its pages no longer exists after a deploy.

## Project structure

Spoticast is an Nx standalone workspace (React 19, Vite, Tailwind CSS v4, React Router, TanStack Query, zustand, Vitest, Storybook). See [CLAUDE.md](CLAUDE.md) for the architecture and conventions.

```
src/app/        shell (navigation, banners), router, shared UI
src/features/   home, podcast, player, queue, archive, filters, search, settings, auth
src/lib/        Spotify client and auth, filter engine, charts, persisted stores
scripts/        fetch-charts.mjs (used by the charts workflow)
.github/        ci, deploy and charts workflows
```
