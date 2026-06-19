# Portal SENAI CIMATEC

Staff portal: sign up with email/password, connect your Google Calendar,
chat with TIA (LLM) to schedule events that live in your Google account.

Deployed as a single **Cloudflare Pages** project — static React app + API in
the same `functions/` directory, both served from your Cloudflare domain.

## Stack

- **Web**: React 18 + Vite + SCSS (Atomic Design).
- **API**: Cloudflare Pages Functions (Workers runtime) + Hono.
- **DB**: Postgres on [Neon](https://neon.tech) (the Neon HTTP driver works from Workers).
- **Auth**: email + password (bcrypt) → JWT in an httpOnly cookie. Google OAuth on top for calendar access.

## Layout

```
portal-senai/
├── apps/web/                 # React app — Vite builds into apps/web/dist
├── functions/
│   ├── api/[[path]].js       # Cloudflare Pages Function — Hono catch-all for /api/*
│   └── _lib/                 # shared API code (routes + helpers; underscore = not a route)
├── db/schema.sql             # users + google_accounts
├── wrangler.toml             # Pages config (build output, compat flags)
├── .dev.vars.example         # local secrets (copy to .dev.vars)
└── package.json              # root deps: hono, jose, @neondatabase/serverless, ...
```

## What's stored where

- **Postgres (Neon)**: users + Google OAuth tokens. No events.
- **Google Calendar**: source of truth for events. The API proxies reads/writes.

## Local development

### 1. Create a Neon database

1. Sign up at https://neon.tech (free tier).
2. Create a project → copy the connection string (it looks like
   `postgresql://USER:PASSWORD@HOST/DB?sslmode=require`).
3. Run the schema once:
   ```bash
   DATABASE_URL='paste-here' npm run db:setup
   ```
   (Requires `psql` locally — `brew install libpq` on mac. Alternatively, paste
   `db/schema.sql` into the Neon dashboard's SQL Editor.)

### 2. Configure local secrets

```bash
cp .dev.vars.example .dev.vars
```

Fill in:

- `DATABASE_URL` — your Neon connection string.
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — see step 3.
- `OPENAI_API_KEY` — from https://platform.openai.com/api-keys.
- `GOOGLE_REDIRECT_URI` stays `http://localhost:8788/api/google/callback`.

### 3. Configure Google OAuth (Cloud Console)

- Enable **Google Calendar API**.
- *APIs & Services → OAuth consent screen* → External → add yourself as a test user.
- *Credentials → Create OAuth client ID → Web application*.
- **Authorized redirect URIs** — add **exactly**:
  - `http://localhost:8788/api/google/callback` (local)
  - `https://YOUR-DOMAIN/api/google/callback` (prod, once deployed)
- Copy client ID + secret into `.dev.vars`.

### 4. Run

```bash
npm install
npm run dev
```

- Web app:  http://localhost:5173
- API:      http://localhost:8788/api (Vite proxies /api → this)
- Wrangler will hot-reload functions when you save.

## Deploy to Cloudflare Pages

### One-time setup

1. Push this repo to GitHub.
2. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the repo. Build config:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: (leave blank)
4. **Environment variables & Secrets** (set both in *Production* and *Preview*):
   - Encrypted: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`.
   - Plaintext: `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI` (use your prod URL),
     `OPENAI_MODEL`.
5. Save and trigger the first deploy.

### Custom domain

After the first deploy succeeds:

1. Pages project → **Custom domains → Set up a custom domain**.
2. Enter your domain (must already be on Cloudflare DNS).
3. Cloudflare creates the CNAME automatically; cert provisions in ~1 minute.
4. Update `GOOGLE_REDIRECT_URI` (Pages env var) and the Google Cloud OAuth
   client's authorized redirect URIs to point at the custom domain.

### Subsequent deploys

```bash
git push                # auto-builds + deploys via the Pages-Git integration
# or manual:
npm run deploy
```

## Cleanup from the old Express version

The old `apps/api/` directory and `docker-compose.yml` are no longer used and
can be deleted:

```bash
rm -rf apps/api docker-compose.yml
```

## Flow

1. `/signup` or `/login` (email + password) → JWT cookie set.
2. Hit `/calendar` → "Conectar Google Calendar" opens a popup, you authorize,
   tokens are saved.
3. Calendar grid loads from Google. Chat panel talks to TIA (LLM), who calls
   `list_events` / `create_event` / `delete_event` under your account.
