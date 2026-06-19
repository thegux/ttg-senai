# Portal SENAI CIMATEC

Portal do colaborador para agendar compromissos usando a TIA.

A ideia é simples: o colaborador cria uma conta com email e senha, conecta o Google Calendar e conversa com a TIA, que é um LLM, para criar, listar ou remover eventos direto na conta Google dele.

Tudo fica em um projeto só no **Cloudflare Pages**. O React estático e a API, que fica em `functions/`, saem do mesmo deploy e rodam no mesmo domínio.

## Stack

- **web**: React 18 + Vite + SCSS, usando atomic design.
- **api**: Cloudflare Pages Functions, com runtime de Workers, usando Hono.
- **db**: Postgres no [Neon](https://neon.tech). O driver HTTP funciona dentro do Worker.
- **auth**: email + senha com bcrypt, JWT em cookie httpOnly e Google OAuth por cima para acessar o Calendar.

## Estrutura do projeto

```txt
portal-senai/
├── apps/web/                 # app React, o Vite gera o build em apps/web/dist
├── functions/
│   ├── api/[[path]].js       # Pages Function, Hono pegando tudo em /api/*
│   └── _lib/                 # código compartilhado da API, rotas e helpers
├── db/schema.sql             # tabelas users + google_accounts
├── wrangler.toml             # config do Pages, output e flags de compatibilidade
├── .dev.vars.example         # variáveis para o dev local, copia para .dev.vars
└── package.json              # deps na raiz: hono, jose, @neondatabase/serverless...
```

## O que fica onde

O Postgres, no Neon, guarda só os usuários e os tokens do Google.

Os eventos não ficam no banco. A fonte da verdade é o Google Calendar. A API só faz a ponte para ler e escrever os eventos na conta do usuário.

## Rodando local

### 1. Criar o banco no Neon

1. Cria uma conta em https://neon.tech. O free tier já resolve.
2. Cria um projeto e copia a connection string. Ela vai ser algo nesse formato:

```txt
postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

3. Roda o schema uma vez:

```bash
DATABASE_URL='cola-aqui' npm run db:setup
```

Para isso, precisa ter o `psql` instalado. No Mac:

```bash
brew install libpq
```

Também dá para abrir o SQL Editor do Neon e colar o conteúdo de `db/schema.sql` direto por lá.

### 2. Criar as variáveis locais

```bash
cp .dev.vars.example .dev.vars
```

Depois preenche:

- `DATABASE_URL`: connection string do Neon.
- `JWT_SECRET`: qualquer string longa e aleatória. Pode gerar com:

```bash
openssl rand -hex 32
```

- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`: vêm do Google Cloud, no passo 3.
- `OPENAI_API_KEY`: pega em https://platform.openai.com/api-keys.
- `GOOGLE_REDIRECT_URI`: no local, usa:

```txt
http://localhost:8788/api/google/callback
```

### 3. Configurar o Google OAuth

No Google Cloud Console:

1. Ativa a **Google Calendar API**.
2. Vai em **APIs & Services → OAuth consent screen**.
3. Escolhe **External** e adiciona seu email como test user.
4. Vai em **Credentials → Create OAuth client ID → Web application**.
5. Em **Authorized redirect URIs**, adiciona exatamente:

```txt
http://localhost:8788/api/google/callback
https://SEU-DOMINIO/api/google/callback
```

A primeira é para rodar local. A segunda é para produção, depois que o projeto estiver publicado.

Depois disso, copia o client id e o secret para o `.dev.vars`.

### 4. Subir o projeto

```bash
npm install
npm run dev
```

URLs locais:

```txt
web: http://localhost:5173
api: http://localhost:8788/api
```

O Vite faz proxy de `/api` para a API local. O Wrangler também faz hot reload das functions quando algum arquivo é salvo.

## Deploy no Cloudflare Pages

### Setup inicial

1. Faz o `git push` do projeto para o GitHub.
2. No Cloudflare, vai em **Workers & Pages → Create → Pages → Connect to Git**.
3. Escolhe o repositório.
4. Usa essa configuração de build:

```txt
Framework preset: None
Build command: npm run build
Build output directory: apps/web/dist
Root directory: deixa em branco
```

5. Em **Environment variables & Secrets**, configura as variáveis para **Production** e **Preview**.

Como encrypted:

```txt
DATABASE_URL
JWT_SECRET
GOOGLE_CLIENT_SECRET
OPENAI_API_KEY
```

Como plaintext:

```txt
GOOGLE_CLIENT_ID
GOOGLE_REDIRECT_URI
OPENAI_MODEL
```

No `GOOGLE_REDIRECT_URI`, usa a URL de produção:

```txt
https://SEU-DOMINIO/api/google/callback
```

Depois salva e roda o primeiro deploy.

## Domínio próprio

Depois que o primeiro deploy passar:

1. Vai no projeto do Pages.
2. Abre **Custom domains → Set up a custom domain**.
3. Coloca o domínio. Ele precisa estar no DNS do Cloudflare.
4. O Cloudflare cria o CNAME sozinho e o certificado costuma sair em pouco tempo.
5. Atualiza o `GOOGLE_REDIRECT_URI` no Pages.
6. Atualiza também os **Authorized redirect URIs** no Google Cloud para apontar para o domínio novo.

## Deploys seguintes

Depois do setup inicial, normalmente é só:

```bash
git push
```

A integração do Pages com o GitHub faz o build e o deploy automaticamente.

Se quiser fazer deploy manual:

```bash
npm run deploy
```

## Limpando arquivos antigos

A pasta `apps/api/` e o `docker-compose.yml` ficaram da versão antiga em Express. Como agora a API roda nas Pages Functions, esses arquivos não são mais necessários.

Pode remover com:

```bash
rm -rf apps/api docker-compose.yml
```

## Fluxo da aplicação

1. O usuário cria conta em `/signup` ou entra por `/login`.
2. A API valida email e senha e seta um cookie de sessão com JWT.
3. Em `/calendar`, o usuário clica em “conectar Google Calendar”.
4. O Google OAuth abre em popup.
5. Depois da autorização, os tokens ficam salvos no banco.
6. A grade do calendário passa a carregar os eventos direto do Google Calendar.
7. O chat da TIA conversa com o LLM.
8. Quando precisa mexer no calendário, a TIA chama ferramentas como `list_events`, `create_event` e `delete_event`, sempre usando a conta Google conectada do usuário.
