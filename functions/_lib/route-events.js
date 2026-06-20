import { Hono } from 'hono';
import { requireUser } from './session.js';
import * as googleService from './google.js';

export const eventsRouter = new Hono();
eventsRouter.use('*', requireUser);

eventsRouter.get('/', async (c) => {
  try {
    const { from, to } = c.req.query();
    const events = await googleService.listEvents(c.env, c.get('userId'), { from, to });
    return c.json({ events });
  } catch (err) {
    return mapGoogleError(c, err);
  }
});

eventsRouter.post('/', async (c) => {
  try {
    const { title, description, location, startsAt, endsAt } = await c.req.json();
    if (!title || !startsAt || !endsAt) {
      return c.json({ error: 'title, startsAt, endsAt required' }, 400);
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      return c.json({ error: 'endsAt must be after startsAt' }, 400);
    }
    const event = await googleService.createEvent(c.env, c.get('userId'), {
      title, description, location, startsAt, endsAt,
    });
    return c.json({ event }, 201);
  } catch (err) {
    return mapGoogleError(c, err);
  }
});

eventsRouter.delete('/:id', async (c) => {
  try {
    await googleService.deleteEvent(c.env, c.get('userId'), c.req.param('id'));
    return c.json({ ok: true });
  } catch (err) {
    return mapGoogleError(c, err);
  }
});

function mapGoogleError(c, err) {
  if (err.message === 'Google not connected') {
    return c.json({ error: 'google_not_connected' }, 409);
  }
  console.error(err);
  // TODO: voltar para 'Internal error' depois de debugar.
  return c.json({ error: err.message ?? 'Internal error', stack: err.stack }, 500);
}
