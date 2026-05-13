import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { requireUser } from '../middleware/session.js';
import * as googleService from '../google.js';

export const googleRouter = Router();

googleRouter.get('/status', requireUser, async (req, res) => {
  const connected = await googleService.isConnected(req.userId);
  res.json({ connected });
});

googleRouter.get('/connect', requireUser, (req, res) => {
  const state = jwt.sign({ sub: req.userId }, env.JWT_SECRET, { expiresIn: '10m' });
  const url = googleService.buildAuthUrl(state);
  res.json({ url });
});

googleRouter.post('/disconnect', requireUser, async (req, res) => {
  await googleService.disconnect(req.userId);
  res.json({ ok: true });
});

googleRouter.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send(renderClosePage(`Erro: ${error}`));
  if (!code || !state) return res.status(400).send(renderClosePage('Faltam parâmetros.'));

  let userId;
  try {
    const payload = jwt.verify(String(state), env.JWT_SECRET);
    userId = payload.sub;
  } catch {
    return res.status(401).send(renderClosePage('Sessão expirada. Tente novamente.'));
  }

  try {
    const tokens = await googleService.exchangeCodeForTokens(String(code));
    await googleService.saveTokens(userId, tokens);
    res.send(renderClosePage('Conta Google conectada. Pode fechar esta janela.', true));
  } catch (err) {
    console.error(err);
    res.status(500).send(renderClosePage('Falha ao conectar com o Google.'));
  }
});

function renderClosePage(message, ok = false) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Google</title>
<style>body{font-family:system-ui;padding:32px;text-align:center;color:#1f2937}
.ok{color:#15803d}.err{color:#b91c1c}</style></head>
<body><p class="${ok ? 'ok' : 'err'}">${message}</p>
<script>setTimeout(() => window.close(), 1200);</script>
</body></html>`;
}
