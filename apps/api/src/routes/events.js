import { Router } from 'express';
import { requireUser } from '../middleware/session.js';
import * as googleService from '../google.js';

export const eventsRouter = Router();
eventsRouter.use(requireUser);

eventsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const events = await googleService.listEvents(req.userId, { from, to });
    res.json({ events });
  } catch (err) {
    if (err.message === 'Google not connected') {
      return res.status(409).json({ error: 'google_not_connected' });
    }
    next(err);
  }
});

eventsRouter.post('/', async (req, res, next) => {
  try {
    const { title, description, location, startsAt, endsAt } = req.body ?? {};
    if (!title || !startsAt || !endsAt) {
      return res.status(400).json({ error: 'title, startsAt, endsAt required' });
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      return res.status(400).json({ error: 'endsAt must be after startsAt' });
    }
    const event = await googleService.createEvent(req.userId, { title, description, location, startsAt, endsAt });
    res.status(201).json({ event });
  } catch (err) {
    if (err.message === 'Google not connected') {
      return res.status(409).json({ error: 'google_not_connected' });
    }
    next(err);
  }
});

eventsRouter.delete('/:id', async (req, res, next) => {
  try {
    await googleService.deleteEvent(req.userId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    if (err.message === 'Google not connected') {
      return res.status(409).json({ error: 'google_not_connected' });
    }
    next(err);
  }
});
