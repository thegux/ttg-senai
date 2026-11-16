import { Hono } from 'hono';
import { requireUser, signShortLived, verifyJwt } from './session.js';
import * as googleService from './google.js';
import { logUsage } from './usage-log.js';

export const googleRouter = new Hono();

googleRouter.get('/status', requireUser, async (c) => {
  const connected = await googleService.isConnected(c.env, c.get('userId'));
  return c.json({ connected });
});

googleRouter.get('/connect', requireUser, async (c) => {
  const state = await signShortLived(c.env, { sub: c.get('userId') }, '10m');
  const url = googleService.buildAuthUrl(c.env, state);
  return c.json({ url });
});

googleRouter.post('/disconnect', requireUser, async (c) => {
  await googleService.disconnect(c.env, c.get('userId'));
  await logUsage(c.env, c.get('userId'), 'google_disconnected');
  return c.json({ ok: true });
});

googleRouter.get('/callback', async (c) => {
  const { code, state, error } = c.req.query();
  if (error) return c.html(closePage(`Erro: ${error}`), 400);
  if (!code || !state) return c.html(closePage('Faltam parâmetros.'), 400);

  let userId;
  try {
    const payload = await verifyJwt(c.env, state);
    userId = payload.sub;
  } catch {
    return c.html(closePage('Sessão expirada. Tente novamente.'), 401);
  }

  try {
    const tokens = await googleService.exchangeCodeForTokens(c.env, code);
    await googleService.saveTokens(c.env, userId, tokens);
    await logUsage(c.env, userId, 'google_connected');
    return c.html(closePage('Conta Google conectada. Pode fechar esta janela.', true));
  } catch (err) {
    console.error(err);
    await logUsage(c.env, userId, 'google_connect_failed', { error: err?.message });
    return c.html(closePage('Falha ao conectar com o Google.'), 500);
  }
});

function closePage(message, ok = false) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Google</title>
<style>body{font-family:system-ui;padding:32px;text-align:center;color:#1f2937}
.ok{color:#15803d}.err{color:#b91c1c}</style></head>
<body><p class="${ok ? 'ok' : 'err'}">${message}</p>
<script>setTimeout(() => window.close(), 1200);</script>
</body></html>`;
}
