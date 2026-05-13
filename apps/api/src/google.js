import { google } from 'googleapis';
import { env } from './env.js';
import { query } from './db.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export function makeOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export function buildAuthUrl(state) {
  return makeOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code) {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export async function saveTokens(userId, tokens) {
  const expiresAt = new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000);
  await query(
    `INSERT INTO google_accounts (user_id, access_token, refresh_token, expires_at, scope, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       access_token  = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, google_accounts.refresh_token),
       expires_at    = EXCLUDED.expires_at,
       scope         = COALESCE(EXCLUDED.scope, google_accounts.scope),
       updated_at    = now()`,
    [userId, tokens.access_token, tokens.refresh_token ?? null, expiresAt, tokens.scope ?? null]
  );
}

export async function getCalendarClient(userId) {
  const result = await query(
    'SELECT access_token, refresh_token, expires_at FROM google_accounts WHERE user_id = $1',
    [userId]
  );
  if (result.rowCount === 0) return null;
  const row = result.rows[0];

  const client = makeOAuthClient();
  client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: new Date(row.expires_at).getTime(),
  });

  client.on('tokens', async (tokens) => {
    await saveTokens(userId, tokens);
  });

  return google.calendar({ version: 'v3', auth: client });
}

export async function listEvents(userId, { from, to, maxResults = 250 } = {}) {
  const calendar = await getCalendarClient(userId);
  if (!calendar) throw new Error('Google not connected');
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: from,
    timeMax: to,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults,
  });
  return (response.data.items ?? []).map(serializeEvent);
}

export async function createEvent(userId, { title, description, location, startsAt, endsAt }) {
  const calendar = await getCalendarClient(userId);
  if (!calendar) throw new Error('Google not connected');
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      description,
      location,
      start: { dateTime: new Date(startsAt).toISOString() },
      end:   { dateTime: new Date(endsAt).toISOString() },
    },
  });
  return serializeEvent(response.data);
}

export async function deleteEvent(userId, eventId) {
  const calendar = await getCalendarClient(userId);
  if (!calendar) throw new Error('Google not connected');
  await calendar.events.delete({ calendarId: 'primary', eventId });
}

export async function disconnect(userId) {
  await query('DELETE FROM google_accounts WHERE user_id = $1', [userId]);
}

export async function isConnected(userId) {
  const result = await query('SELECT 1 FROM google_accounts WHERE user_id = $1', [userId]);
  return result.rowCount > 0;
}

function serializeEvent(event) {
  return {
    id: event.id,
    title: event.summary ?? '(sem título)',
    description: event.description ?? null,
    location: event.location ?? null,
    startsAt: event.start?.dateTime ?? event.start?.date ?? null,
    endsAt:   event.end?.dateTime   ?? event.end?.date   ?? null,
    htmlLink: event.htmlLink ?? null,
  };
}
