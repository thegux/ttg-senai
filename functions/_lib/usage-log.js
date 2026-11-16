// Logger de uso: registra ações relevantes na tabela usage_logs.
// Falhas no logger são silenciosas (log no console) — não derrubam a request principal.
import { getSql } from './db.js';

export async function logUsage(env, userId, action, metadata = null) {
  try {
    const sql = getSql(env);
    await sql`
      INSERT INTO usage_logs (user_id, action, metadata)
      VALUES (${userId ?? null}, ${action}, ${metadata ? JSON.stringify(metadata) : null})
    `;
  } catch (err) {
    console.error('logUsage falhou:', err?.message ?? err);
  }
}
