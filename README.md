# Portal SENAI CIMATEC

Portal para funcionários: cadastro com e-mail/senha, conexão com Google Calendar e chat com a TIA (LLM) para agendar eventos direto na sua conta Google.

## Stack

- **web**: React 18 (JS) + Vite + SCSS, com componentes organizados seguindo Atomic Design.
- **api**: Node 20 + Express, Postgres para usuários/tokens do Google, `googleapis` para calendário e `openai` para o chat com tool-calling.
- **auth**: e-mail + senha (bcrypt) → cookie JWT. Google OAuth por cima para acesso ao calendário.

## O que fica salvo onde

- **Postgres**: usuários + tokens OAuth do Google. Nenhum evento.
- **Google Calendar**: fonte oficial dos eventos. A API só faz o proxy das leituras/escritas.

## Setup

```bash
cp .env.example .env
docker compose up -d           # Postgres na porta :5433
npm install
npm run db:setup               # cria as tabelas users + google_accounts
npm run dev                    # api :3001, web :5173
```

Preencha isso no `.env` antes de rodar `npm run dev`:

1. **Google OAuth** — no Google Cloud Console:
   - Ative a **Google Calendar API**.
   - Crie um OAuth client (**Web application**).
   - Adicione `http://localhost:3001/google/callback` como authorized redirect URI.
   - Copie o client ID + secret para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

2. **OpenAI** — cole sua API key em `OPENAI_API_KEY`.

## Fluxo

1. `/signup` ou `/login` (e-mail + senha).
2. Acesse `/calendar` → “Connect Google Calendar” abre um popup, você autoriza e os tokens são salvos.
3. O grid do calendário carrega os eventos do Google. O painel de chat conversa com a TIA (LLM), que chama `list_events` / `create_event` / `delete_event` usando a sua conta.

## Estrutura

```text
apps/
├─ web/   App React (Vite)
└─ api/   Express + Postgres + Google + OpenAI
```
