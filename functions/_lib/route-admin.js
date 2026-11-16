import { Hono } from 'hono';
import { getSql } from './db.js';
import { requireUser, requireAdmin } from './session.js';

export const adminRouter = new Hono();
adminRouter.use('*', requireUser, requireAdmin);

// GET /api/admin/logs?limit=200&action=login
// Retorna os logs mais recentes, opcionalmente filtrados por ação.
adminRouter.get('/logs', async (c) => {
  const sql = getSql(c.env);
  const limitRaw = parseInt(c.req.query('limit') ?? '200', 10);
  const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 200), 1000);
  const action = c.req.query('action');

  const rows = action
    ? await sql`
        SELECT l.id, l.action, l.metadata, l.created_at,
               l.user_id, u.email, u.name
        FROM usage_logs l
        LEFT JOIN users u ON u.id = l.user_id
        WHERE l.action = ${action}
        ORDER BY l.created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT l.id, l.action, l.metadata, l.created_at,
               l.user_id, u.email, u.name
        FROM usage_logs l
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.created_at DESC
        LIMIT ${limit}
      `;

  return c.json({ logs: rows });
});

// GET /api/admin/stats — contagem agregada por ação (últimos 30 dias).
adminRouter.get('/stats', async (c) => {
  const sql = getSql(c.env);
  const rows = await sql`
    SELECT action, COUNT(*) AS count
    FROM usage_logs
    WHERE created_at > now() - INTERVAL '30 days'
    GROUP BY action
    ORDER BY count DESC
  `;
  return c.json({ stats: rows.map((r) => ({ action: r.action, count: Number(r.count) })) });
});
