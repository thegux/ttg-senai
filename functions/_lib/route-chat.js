import { Hono } from 'hono';
import OpenAI from 'openai';
import { requireUser } from './session.js';
import * as googleService from './google.js';

const tools = [
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: "List the user's calendar events in a given window. Use to check for conflicts.",
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'ISO datetime (inclusive lower bound).' },
          to:   { type: 'string', description: 'ISO datetime (exclusive upper bound).' },
        },
        required: ['from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: "Create an event on the user's primary calendar. Confirm with the user before calling.",
      parameters: {
        type: 'object',
        properties: {
          title:       { type: 'string' },
          startsAt:    { type: 'string', description: 'ISO datetime.' },
          endsAt:      { type: 'string', description: 'ISO datetime.' },
          location:    { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'startsAt', 'endsAt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Delete an event by id. Confirm with the user before calling.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
];

async function runTool(env, userId, name, args) {
  if (name === 'list_events')  return { events: await googleService.listEvents(env, userId, { from: args.from, to: args.to }) };
  if (name === 'create_event') return { event:  await googleService.createEvent(env, userId, args) };
  if (name === 'delete_event') { await googleService.deleteEvent(env, userId, args.id); return { ok: true }; }
  throw new Error(`Unknown tool: ${name}`);
}

function systemPrompt(userName) {
  const now = new Date().toISOString();
  return `Você é a TIA, assistente virtual do Portal do Colaborador SENAI CIMATEC.
Fala em português brasileiro, de forma concisa e profissional.
Você ajuda ${userName} a gerenciar compromissos no Google Calendar.

Regras:
- Hora atual: ${now} (UTC). Assuma fuso America/Bahia (UTC-3) quando o usuário falar em horários locais.
- Antes de criar um evento, SEMPRE use list_events para checar conflitos na janela proposta.
- Se houver conflito, explique e proponha 2-3 horários alternativos próximos.
- Confirme título, início e fim com o usuário antes de chamar create_event.
- Após criar ou apagar um evento, responda com 1 frase curta confirmando.`;
}

export const chatRouter = new Hono();
chatRouter.use('*', requireUser);

chatRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const { messages = [], userName = 'colaborador' } = await c.req.json().catch(() => ({}));

  if (!(await googleService.isConnected(c.env, userId))) {
    return c.json({ error: 'google_not_connected' }, 409);
  }

  const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });
  const conversation = [{ role: 'system', content: systemPrompt(userName) }, ...messages];

  try {
    for (let i = 0; i < 6; i++) {
      const completion = await openai.chat.completions.create({
        model: c.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: conversation,
        tools,
      });
      const choice = completion.choices[0].message;
      conversation.push(choice);

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        return c.json({ reply: choice.content ?? '', messages: stripSystem(conversation) });
      }

      for (const call of choice.tool_calls) {
        let result;
        try {
          const args = JSON.parse(call.function.arguments || '{}');
          result = await runTool(c.env, userId, call.function.name, args);
        } catch (err) {
          result = { error: err.message };
        }
        conversation.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return c.json({
      reply: 'Desculpe, não consegui concluir a operação. Pode tentar de novo?',
      messages: stripSystem(conversation),
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: err.message || 'Internal error' }, 500);
  }
});

function stripSystem(conversation) {
  return conversation.filter((m) => m.role !== 'system');
}
