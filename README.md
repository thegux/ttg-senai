# Portal SENAI CIMATEC

Staff portal: sign up with email/password, connect your Google Calendar, chat with TIA (LLM) to schedule events that live in your Google account.

## Stack

- **web**: React 18 (JS) + Vite + SCSS, components organized by Atomic Design.
- **api**: Node 20 + Express, Postgres for users/Google tokens, `googleapis` for calendar, `openai` for chat with tool-calling.
- **auth**: email + password (bcrypt) → JWT cookie. Google OAuth on top for calendar access.

## What's stored where

- **Postgres**: users + Google OAuth tokens. No events.
- **Google Calendar**: source of truth for events. The API proxies reads/writes.

## Setup

```bash
cp .env.example .env
docker compose up -d           # Postgres on :5433
npm install
npm run db:setup               # creates users + google_accounts tables
npm run dev                    # api :3001, web :5173
```

Fill these in `.env` before `npm run dev`:

1. **Google OAuth** — in Google Cloud Console:
   - Enable **Google Calendar API**.
   - Create OAuth client (**Web application**).
   - Add `http://localhost:3001/google/callback` as authorized redirect URI.
   - Copy the client ID + secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

2. **OpenAI** — paste your API key into `OPENAI_API_KEY`.

## Flow

1. `/signup` or `/login` (email + password).
2. Hit `/calendar` → "Connect Google Calendar" opens a popup, you authorize, tokens are saved.
3. Calendar grid loads from Google. Chat panel talks to TIA (LLM), who calls `list_events` / `create_event` / `delete_event` under your account.

## Layout

```
apps/
├─ web/   React app (Vite)
└─ api/   Express + Postgres + Google + OpenAI
```
