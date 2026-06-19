import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { getSql } from './db.js';
import { signSession, setSessionCookie, clearSessionCookie, requireUser } from './session.js';

export const authRouter = new Hono();

authRouter.post('/signup', async (c) => {
  const { email, name, password } = await c.req.json().catch(() => ({}));
  if (!email || !name || !password) {
    return c.json({ error: 'email, name, password required' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const sql = getSql(c.env);
  const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (existing.length > 0) return c.json({ error: 'Email already registered' }, 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, ${name}, ${passwordHash})
    RETURNING id, email, name
  `;

  setSessionCookie(c, await signSession(c.env, user.id));
  return c.json({ user });
});

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) return c.json({ error: 'email and password required' }, 400);

  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, email, name, password_hash FROM users WHERE email = ${email}
  `;
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  setSessionCookie(c, await signSession(c.env, row.id));
  return c.json({ user: { id: row.id, email: row.email, name: row.name } });
});

authRouter.post('/logout', (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRouter.get('/me', requireUser, async (c) => {
  const sql = getSql(c.env);
  const rows = await sql`SELECT id, email, name FROM users WHERE id = ${c.get('userId')}`;
  if (rows.length === 0) return c.json({ error: 'User not found' }, 401);
  return c.json({ user: rows[0] });
});
