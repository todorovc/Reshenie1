# EchoDiary

> A quiet diary for the songs you keep returning to.

EchoDiary is a personal music diary built on top of the Spotify Web API. It
turns your recent listening into a daily record you can actually sit with —
grouped by day, annotated with what you've liked, and summarised with a few
calm insights about the artists you reached for.

The app is fullstack TypeScript:

- **Backend**: Express 5 with `express-session` (in-memory `memorystore`) for
  HTTP-only session cookies, server-side Spotify OAuth 2.0 with PKCE, and a
  thin set of `/api/*` routes that the client talks to.
- **Frontend**: Vite + React 18 + Tailwind v3 + shadcn/ui, wouter for hash
  routing, TanStack Query for data fetching.
- **Database**: Drizzle ORM over `better-sqlite3` is wired up by the template
  but is **not used** for tokens — see the security note below.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5000
```

For a production build:

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

The Express server serves both the API (`/api/*`, `/auth/*`) and the built
frontend on the same port.

---

## Demo mode

If `SPOTIFY_CLIENT_ID` and `SPOTIFY_REDIRECT_URI` are missing from the
environment, EchoDiary runs in **demo mode**. The landing page shows a
"Try the demo experience" button instead of "Sign in with Spotify". Clicking
it calls `POST /api/demo-login`, which creates a server-side session flagged
`demoActive` and unlocks a fully synthetic dataset:

- A demo profile (`Mira Ostrov`, premium, Germany) returned by `/api/profile`
- ~42 recently-played entries spread across the last 6 days, returned by
  `/api/listening-history`
- Aggregated insights computed from that feed, returned by `/api/insights`

The demo dataset lives entirely in `server/demo-data.ts`. Album covers are
inline-SVG gradient placeholders so the UI never depends on external image
fetches. The demo feed is regenerated on every request so the "Today" group
always lines up with the current date.

---

## Real Spotify integration

1. Create an app at <https://developer.spotify.com/dashboard>.
2. In the app's settings, add a **Redirect URI** that exactly matches the
   value you'll set as `SPOTIFY_REDIRECT_URI` (for local development:
   `http://localhost:5000/auth/callback`).
3. Copy `.env.example` to `.env` and fill in:

   ```env
   SESSION_SECRET=<long random string>
   SPOTIFY_CLIENT_ID=<your client id>
   SPOTIFY_REDIRECT_URI=http://localhost:5000/auth/callback
   # Optional — only set if you want the confidential-client variant of PKCE
   # SPOTIFY_CLIENT_SECRET=<your client secret>
   ```

4. Restart `npm run dev`. The home page now shows **Sign in with Spotify**.

### Scopes requested

```
user-read-private user-read-email user-read-recently-played user-library-read
```

### OAuth flow (Authorization Code with PKCE)

- `GET /auth/login` generates a fresh `code_verifier` + `code_challenge`
  (S256) and a CSRF `state`, stashes them in the session, then redirects to
  `https://accounts.spotify.com/authorize?...&show_dialog=true`.
- `GET /auth/callback` validates the returned `state`, exchanges the
  authorization code for access + refresh tokens, and stores them in
  `req.session.spotifyTokens` (server-side only). The user is then sent to
  `/#/profile`.
- `POST /auth/logout` destroys the session and clears the cookie.
- Token refresh is automatic. `ensureFreshTokens()` in `server/spotify.ts`
  checks `expiresAt` on every API call and refreshes when needed.

### Friendly error states

The login route handles a few common failure modes by redirecting back to
`/?auth_error=...#/`. The home page reads `window.location.search` and
renders a small alert. Recognised codes: `not_configured`, `state_mismatch`,
`missing_params`, `exchange_failed`, `access_denied`.

---

## API surface

| Method | Path                              | Behaviour                                                                |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/config`, `/api/auth/status` | Returns `{ spotifyConfigured, authStatus, scopes }`.                     |
| GET    | `/auth/login`                     | Starts the Spotify PKCE flow (or redirects with `auth_error` if unset).  |
| GET    | `/auth/callback`                  | Exchanges the auth code for tokens and seeds the session.                |
| POST   | `/auth/logout`                    | Destroys the session.                                                    |
| POST   | `/api/demo-login`                 | Flags the session as `demoActive`.                                       |
| GET    | `/api/profile`                    | Real Spotify `/me` or the demo profile.                                  |
| GET    | `/api/listening-history`          | 50 most recent plays + a liked-set lookup, grouped by day on the client. |
| GET    | `/api/insights?metric=…`          | Top-artist aggregates ranked by `track_count` or `listening_time`.       |

Response shapes are exported from `shared/schema.ts` so client and server
share types.

---

## Security & storage policy

EchoDiary **never** stores Spotify tokens (or any user-identifying data) on
the client:

- Tokens live exclusively in `req.session.spotifyTokens`. The session is
  signed and HTTP-only, with a `__Host-`-prefixed name in production.
- The client uses TanStack Query against the backend; nothing sensitive is
  read from `localStorage`, `sessionStorage`, `indexedDB`, or cookies that
  the browser can read.
- The theme (light/dark) is derived from `prefers-color-scheme` and held in
  React state — also no client storage.

### Production recommendation

The bundled session store is `memorystore`, which is fine for a prototype
but loses sessions on every server restart and does not scale across
processes. Before going to production, replace it with:

- **Redis** via `connect-redis` (recommended)
- **DynamoDB** via `connect-dynamodb`
- or any production session store of your choice

Set a long random `SESSION_SECRET`, enforce HTTPS, and keep
`SPOTIFY_CLIENT_SECRET` (if you use confidential-client PKCE) only in your
server-side secret manager.

---

## Project layout

```
echodiary-app/
├── client/
│   ├── public/favicon.svg
│   └── src/
│       ├── App.tsx                  # routes
│       ├── components/
│       │   ├── Layout.tsx           # header + nav + theme toggle
│       │   ├── Logo.tsx             # inline SVG mark
│       │   └── ThemeProvider.tsx    # system-preference based dark mode
│       ├── lib/
│       │   ├── format.ts            # duration / date helpers
│       │   └── queryClient.ts       # credentials: include for sessions
│       └── pages/
│           ├── home.tsx
│           ├── profile.tsx
│           ├── history.tsx
│           ├── insights.tsx
│           └── not-found.tsx
├── server/
│   ├── index.ts                     # Express bootstrap
│   ├── routes.ts                    # /api + /auth routes
│   ├── session.ts                   # express-session setup
│   ├── spotify.ts                   # PKCE + token refresh + API helpers
│   ├── demo-data.ts                 # synthetic profile + listening feed
│   └── storage.ts                   # template Drizzle storage (unused)
├── shared/
│   └── schema.ts                    # Drizzle table + API response types
└── .env.example
```

---

## Known limitations

- The session store is in-memory; production deployments should switch to
  Redis or another persistent store before serving real users.
- Saved-tracks lookup is bounded to the first ~200 saved tracks (4 pages of
  50) to keep response time reasonable. Tracks older than that won't be
  marked liked even if they are in your library.
- The demo dataset is curated rather than randomly generated, so it always
  shows the same shape of insights between sessions.
