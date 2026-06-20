// Single Cloudflare Pages Function that handles every /api/* request.
// We use Hono for routing because it is the Workers-native answer to Express.

import { Hono } from 'hono';
import { authRouter }   from '../_lib/route-auth.js';
import { googleRouter } from '../_lib/route-google.js';
import { eventsRouter } from '../_lib/route-events.js';
import { chatRouter }   from '../_lib/route-chat.js';

const app = new Hono().basePath('/api');

app.get('/health', (c) => c.json({ ok: true }));
app.route('/auth',   authRouter);
app.route('/google', googleRouter);
app.route('/events', eventsRouter);
app.route('/chat',   chatRouter);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message ?? 'Erro interno do servidor.' }, 500);
});

// Pages Functions entry point.
export const onRequest = (context) => app.fetch(context.request, context.env, context);
