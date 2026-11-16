// Google OAuth + Calendar v3, called directly via fetch.
// We don't use the `googleapis` npm package — it depends on Node internals.

import { getSql } from './db.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary';

export function buildAuthUrl(env, state) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(env, code) {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`Google token exchange failed: ${await r.text()}`);
  return r.json(); // { access_token, refresh_token, expires_in, scope, ... }
}

async function refreshTokens(env, userId, refreshToken) {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await r.json().catch(() => ({}));

  // invalid_grant = refresh token foi revogado, expirou (modo Testing) ou já foi usado.
  // Apagamos o vínculo e sinalizamos pro frontend que precisa reconectar.
  if (!r.ok && data.error === 'invalid_grant') {
    console.warn(`refresh invalid_grant para user ${userId}; limpando google_accounts`);
    await disconnect(env, userId);
    throw new Error('Google not connected');
  }

  if (!r.ok) {
    throw new Error(`Google token refresh failed: ${JSON.stringify(data)}`);
  }
  return data; // { access_token, expires_in, scope, ... } (sem novo refresh_token)
}

export async function saveTokens(env, userId, tokens) {
  const sql = getSql(env);
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  await sql`
    INSERT INTO google_accounts (user_id, access_token, refresh_token, expires_at, scope, updated_at)
    VALUES (${userId}, ${tokens.access_token}, ${tokens.refresh_token ?? null},
            ${expiresAt.toISOString()}, ${tokens.scope ?? null}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      access_token  = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, google_accounts.refresh_token),
      expires_at    = EXCLUDED.expires_at,
      scope         = COALESCE(EXCLUDED.scope, google_accounts.scope),
      updated_at    = now()
  `;
}

export async function disconnect(env, userId) {
  const sql = getSql(env);
  await sql`DELETE FROM google_accounts WHERE user_id = ${userId}`;
}

export async function isConnected(env, userId) {
  const sql = getSql(env);
  const rows = await sql`SELECT 1 FROM google_accounts WHERE user_id = ${userId}`;
  return rows.length > 0;
}

// Returns a valid access token, refreshing + persisting if needed.
async function getAccessToken(env, userId) {
  const sql = getSql(env);
  const rows = await sql`
    SELECT access_token, refresh_token, expires_at
    FROM google_accounts WHERE user_id = ${userId}
  `;
  if (rows.length === 0) throw new Error('Google not connected'); // string interna usada pelo handler de erro
  const row = rows[0];

  const expiresAt = new Date(row.expires_at).getTime();
  // refresh if expired or expiring in the next 60s
  if (expiresAt > Date.now() + 60_000) return row.access_token;

  const fresh = await refreshTokens(env, userId, row.refresh_token);
  await saveTokens(env, userId, { ...fresh, refresh_token: row.refresh_token });
  return fresh.access_token;
}

async function calFetch(env, userId, path, init = {}) {
  const token = await getAccessToken(env, userId);
  const r = await fetch(`${CAL_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google Calendar error ${r.status}: ${data.error?.message ?? r.statusText}`);
  return data;
}

// Extrai o rótulo de relevância embutido na descrição ("[Relevância: alta]").
// Retorna a descrição limpa (sem a tag) e o valor do rótulo, se houver.
const RELEVANCE_RE = /^\s*\[Relev[aâ]ncia:\s*(baixa|m[eé]dia|alta)\]\s*\n?\n?/i;

function parseRelevance(desc) {
  if (!desc) return { relevance: null, cleanDescription: null };
  const m = desc.match(RELEVANCE_RE);
  if (!m) return { relevance: null, cleanDescription: desc };
  const raw = m[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const rest = desc.slice(m[0].length).trim();
  return { relevance: raw, cleanDescription: rest || null };
}

function serializeEvent(e) {
  const { relevance, cleanDescription } = parseRelevance(e.description);
  return {
    id: e.id,
    title: e.summary ?? '(sem título)',
    description: cleanDescription,
    location: e.location ?? null,
    startsAt: e.start?.dateTime ?? e.start?.date ?? null,
    endsAt:   e.end?.dateTime   ?? e.end?.date   ?? null,
    htmlLink: e.htmlLink ?? null,
    relevance, // 'baixa' | 'media' | 'alta' | null
  };
}

export async function listEvents(env, userId, { from, to, maxResults = 250 } = {}) {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });
  if (from) params.set('timeMin', from);
  if (to)   params.set('timeMax', to);
  const data = await calFetch(env, userId, `/events?${params}`);
  return (data.items ?? []).map(serializeEvent);
}

export async function createEvent(env, userId, { title, description, location, startsAt, endsAt, attendees, relevance }) {
  // sendUpdates=all faz o Google mandar email pros convidados.
  // Relevância é persistida como prefixo na descrição, pra sobreviver mesmo que o evento
  // seja editado fora do portal (no app oficial do Google Calendar).
  const relTag = relevance ? `[Relevância: ${relevance}]` : null;
  const composedDescription = [relTag, description].filter(Boolean).join('\n\n') || undefined;

  const data = await calFetch(env, userId, '/events?sendUpdates=all', {
    method: 'POST',
    body: JSON.stringify({
      summary: title,
      description: composedDescription,
      location,
      start: { dateTime: new Date(startsAt).toISOString() },
      end:   { dateTime: new Date(endsAt).toISOString() },
      attendees: Array.isArray(attendees) ? attendees.map((email) => ({ email })) : undefined,
    }),
  });
  return serializeEvent(data);
}

export async function deleteEvent(env, userId, eventId) {
  await calFetch(env, userId, `/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}
