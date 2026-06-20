import { SignJWT, jwtVerify } from 'jose';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

const ALG = 'HS256';
const COOKIE_NAME = 'session';
const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

function secretKey(env) {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signSession(env, userId) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey(env));
}

export async function signShortLived(env, payload, expiresIn = '10m') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(env));
}

export async function verifyJwt(env, token) {
  const { payload } = await jwtVerify(token, secretKey(env));
  return payload;
}

export function cookieOptions(c) {
  return {
    httpOnly: true,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
    path: '/',
    maxAge: SEVEN_DAYS_S,
  };
}

export function setSessionCookie(c, token) {
  setCookie(c, COOKIE_NAME, token, cookieOptions(c));
}

export function clearSessionCookie(c) {
  deleteCookie(c, COOKIE_NAME, { path: '/' });
}

// Hono middleware. Sets c.var.userId on success, else 401.
export async function requireUser(c, next) {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return c.json({ error: 'Você precisa estar logado.' }, 401);
  try {
    const payload = await verifyJwt(c.env, token);
    c.set('userId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Sessão inválida ou expirada. Faça login de novo.' }, 401);
  }
}
