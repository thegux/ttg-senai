import { neon } from '@neondatabase/serverless';

// One sql() per request — the Neon HTTP client is cheap to instantiate
// and there is no connection to keep open across requests.
export function getSql(env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  return neon(env.DATABASE_URL);
}
