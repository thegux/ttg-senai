import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { getSql } from './db.js';
import {
  signSession, setSessionCookie, clearSessionCookie, requireUser,
  signShortLived, verifyJwt,
} from './session.js';
import { sendEmail, passwordResetEmail } from './email.js';
import { logUsage } from './usage-log.js';

export const authRouter = new Hono();

authRouter.post('/signup', async (c) => {
  const { email, name, password } = await c.req.json().catch(() => ({}));
  if (!email || !name || !password) {
    return c.json({ error: 'Email, nome e senha são obrigatórios.' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
  }

  const sql = getSql(c.env);
  const existing = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    await logUsage(c.env, null, 'signup_duplicate_email', { email });
    return c.json({ error: 'Esse email já está cadastrado.' }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, ${name}, ${passwordHash})
    RETURNING id, email, name
  `;

  setSessionCookie(c, await signSession(c.env, user.id));
  await logUsage(c.env, user.id, 'signup', { email: user.email });
  return c.json({ user });
});

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) {
    return c.json({ error: 'Email e senha são obrigatórios.' }, 400);
  }

  const sql = getSql(c.env);
  const rows = await sql`
    SELECT id, email, name, password_hash FROM users WHERE email = ${email}
  `;
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    await logUsage(c.env, row?.id ?? null, 'login_failed', { email });
    return c.json({ error: 'Email ou senha incorretos.' }, 401);
  }

  setSessionCookie(c, await signSession(c.env, row.id));
  await logUsage(c.env, row.id, 'login');
  return c.json({ user: { id: row.id, email: row.email, name: row.name } });
});

authRouter.post('/logout', requireUser, async (c) => {
  await logUsage(c.env, c.get('userId'), 'logout');
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRouter.get('/me', requireUser, async (c) => {
  const sql = getSql(c.env);
  const rows = await sql`SELECT id, email, name, role FROM users WHERE id = ${c.get('userId')}`;
  if (rows.length === 0) return c.json({ error: 'Usuário não encontrado.' }, 401);
  return c.json({ user: rows[0] });
});

// ---------- Reset de senha ----------

// Sempre retorna ok=true, mesmo se o email não existir.
// Assim evitamos vazar quais emails estão cadastrados.
authRouter.post('/forgot', async (c) => {
  const { email } = await c.req.json().catch(() => ({}));
  if (!email) return c.json({ error: 'Email é obrigatório.' }, 400);

  const sql = getSql(c.env);
  const rows = await sql`SELECT id, name FROM users WHERE email = ${email}`;
  const user = rows[0];

  if (user) {
    try {
      const token = await signShortLived(c.env, { sub: user.id, kind: 'pwd_reset' }, '1h');
      const origin = new URL(c.req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      const { subject, html } = passwordResetEmail({ name: user.name, resetUrl });
      await sendEmail(c.env, { to: email, subject, html });
      await logUsage(c.env, user.id, 'password_reset_requested');
    } catch (err) {
      console.error('Erro ao enviar email de reset:', err);
      await logUsage(c.env, user.id, 'password_reset_email_failed', { error: err?.message });
    }
  } else {
    await logUsage(c.env, null, 'password_reset_unknown_email', { email });
  }

  return c.json({
    ok: true,
    message: 'Se o email existir, enviaremos um link para redefinir a senha.',
  });
});

authRouter.post('/reset', async (c) => {
  const { token, password } = await c.req.json().catch(() => ({}));
  if (!token || !password) {
    return c.json({ error: 'Token e nova senha são obrigatórios.' }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' }, 400);
  }

  let payload;
  try {
    payload = await verifyJwt(c.env, token);
  } catch {
    return c.json({ error: 'Link inválido ou expirado. Peça um novo.' }, 401);
  }
  if (payload.kind !== 'pwd_reset' || !payload.sub) {
    return c.json({ error: 'Link inválido. Peça um novo.' }, 401);
  }

  const sql = getSql(c.env);
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await sql`
    UPDATE users SET password_hash = ${passwordHash} WHERE id = ${payload.sub}
    RETURNING id
  `;
  if (result.length === 0) {
    return c.json({ error: 'Usuário não encontrado.' }, 404);
  }

  await logUsage(c.env, payload.sub, 'password_reset_completed');
  return c.json({ ok: true, message: 'Senha redefinida. Você já pode entrar com a nova senha.' });
});
