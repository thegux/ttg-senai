import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signSession, requireUser, cookieOptions } from '../middleware/session.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const { email, name, password } = req.body ?? {};
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name, password required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
    [email, name, passwordHash]
  );
  const user = result.rows[0];
  res.cookie('session', signSession(user.id), cookieOptions);
  res.json({ user });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  const result = await query(
    'SELECT id, email, name, password_hash FROM users WHERE email = $1',
    [email]
  );
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.cookie('session', signSession(row.id), cookieOptions);
  res.json({ user: { id: row.id, email: row.email, name: row.name } });
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('session', cookieOptions);
  res.json({ ok: true });
});

authRouter.get('/me', requireUser, async (req, res) => {
  const result = await query('SELECT id, email, name FROM users WHERE id = $1', [req.userId]);
  if (result.rowCount === 0) return res.status(401).json({ error: 'User not found' });
  res.json({ user: result.rows[0] });
});
