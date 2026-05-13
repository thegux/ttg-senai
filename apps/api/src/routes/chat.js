import { Router } from 'express';
import OpenAI from 'openai';
import { env } from '../env.js';
import { requireUser } from '../middleware/session.js';
import * as googleService from '../google.js';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const tools = [
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'List the user\'s calendar events in a given window. Use to check for conflicts.',
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
      description: 'Create an event on the user\'s primary calendar. Confirm with the user before calling.',
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

async function runTool(userId, name, args) {
  if (name === 'list_events') {
    const events = await googleService.listEvents(userId, { from: args.from, to: args.to });
    return { events };
  }
  if (name === 'create_event') {
    const event = await googleService.createEvent(userId, args);
    return { event };
  }
  if (name === 'delete_event') {
    await googleService.deleteEvent(userId, args.id);
    return { ok: true };
  }
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

export const chatRouter = Router();
chatRouter.use(requireUser);

chatRouter.post('/', async (req, res, next) => {
  try {
    const { messages = [], userName = 'colaborador' } = req.body ?? {};

    if (!(await googleService.isConnected(req.userId))) {
      return res.status(409).json({ error: 'google_not_connected' });
    }

    const conversation = [
      { role: 'system', content: systemPrompt(userName) },
      ...messages,
    ];

    for (let i = 0; i < 6; i++) {
      const completion = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: conversation,
        tools,
      });
      const choice = completion.choices[0].message;
      conversation.push(choice);

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        return res.json({ reply: choice.content ?? '', messages: stripSystem(conversation) });
      }

      for (const call of choice.tool_calls) {
        let result;
        try {
          const args = JSON.parse(call.function.arguments || '{}');
          result = await runTool(req.userId, call.function.name, args);
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

    res.json({
      reply: 'Desculpe, não consegui concluir a operação. Pode tentar de novo?',
      messages: stripSystem(conversation),
    });
  } catch (err) {
    next(err);
  }
});

function stripSystem(conversation) {
  return conversation.filter((m) => m.role !== 'system');
}
