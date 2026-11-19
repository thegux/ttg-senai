import { Hono } from 'hono';
import { requireUser } from './session.js';
import * as googleService from './google.js';
import { logUsage } from './usage-log.js';
import { rangeOutsideBusinessHours, businessHoursDescription } from './business-hours.js';

const RELEVANCE_VALUES = ['baixa', 'media', 'alta'];

const tools = [
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: "Lista eventos do calendário do usuário em uma janela temporal. Use para checar conflitos antes de criar.",
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'ISO datetime (limite inferior inclusivo).' },
          to:   { type: 'string', description: 'ISO datetime (limite superior exclusivo).' },
        },
        required: ['from', 'to'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: "Cria um evento no calendário primário do usuário. Confirme com o usuário antes de chamar.",
      parameters: {
        type: 'object',
        properties: {
          title:       { type: 'string' },
          startsAt:    { type: 'string', description: 'ISO datetime.' },
          endsAt:      { type: 'string', description: 'ISO datetime.' },
          location:    { type: 'string' },
          description: { type: 'string' },
          attendees:   {
            type: 'array',
            description: 'Emails dos convidados. Eles receberão o invite por email.',
            items: { type: 'string', format: 'email' },
          },
          relevance: {
            type: 'string',
            enum: RELEVANCE_VALUES,
            description: 'Rótulo de relevância do evento. Atribua com base no contexto da conversa.',
          },
          force_outside_hours: {
            type: 'boolean',
            description: 'Marque como true SOMENTE se o usuário confirmou explicitamente que quer marcar fora do horário de atendimento.',
          },
        },
        required: ['title', 'startsAt', 'endsAt', 'relevance'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Apaga um evento pelo id. Confirme com o usuário antes de chamar.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
];

async function runTool(env, userId, name, args) {
  if (name === 'list_events') {
    return { events: await googleService.listEvents(env, userId, { from: args.from, to: args.to }) };
  }
  if (name === 'create_event') {
    // Valida relevância.
    if (!RELEVANCE_VALUES.includes(args.relevance)) {
      return { error: 'relevance deve ser um de: baixa, media, alta.' };
    }
    // Horário de atendimento: se fora, só cria com confirmação explícita (force_outside_hours=true).
    if (rangeOutsideBusinessHours(args.startsAt, args.endsAt) && !args.force_outside_hours) {
      return {
        error: 'fora_do_horario_de_atendimento',
        message: `O horário proposto está fora do expediente (${businessHoursDescription()}). Pergunte ao usuário se ele realmente quer marcar fora do horário. Se ele confirmar, chame create_event de novo passando force_outside_hours=true.`,
      };
    }
    const event = await googleService.createEvent(env, userId, args);
    await logUsage(env, userId, 'event_created', {
      source: 'tia',
      eventId: event.id,
      title: event.title,
      startsAt: event.startsAt,
      relevance: event.relevance,
      outsideHours: !!args.force_outside_hours,
    });
    return { event };
  }
  if (name === 'delete_event') {
    await googleService.deleteEvent(env, userId, args.id);
    await logUsage(env, userId, 'event_deleted', { source: 'tia', eventId: args.id });
    return { ok: true };
  }
  throw new Error(`Unknown tool: ${name}`);
}

const TZ = 'America/Bahia';

function localDateLabel(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
}

function upcomingDays(count) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => `- ${localDateLabel(new Date(now + i * 86400000))}`).join('\n');
}

function systemPrompt(userName) {
  const now = new Date();
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(now);
  return `Você é a TIA, assistente virtual do Portal do Colaborador SENAI CIMATEC.
Fala em português brasileiro, de forma concisa e profissional.
Você ajuda ${userName} a gerenciar compromissos no Google Calendar.

Data e hora:
- Agora é ${localDateLabel(now)}, ${time} (fuso America/Bahia, UTC-3). Use esse fuso para os horários do usuário.
- Calendário dos próximos dias (use esta lista para converter "segunda", "amanhã", "semana que vem" etc. em datas; NUNCA calcule dia da semana por conta própria):
${upcomingDays(21)}

Regras:
- Antes de criar um evento, SEMPRE use list_events para checar conflitos na janela proposta.
- Se houver conflito, explique e proponha 2-3 horários alternativos próximos.
- Confirme título, início e fim com o usuário antes de chamar create_event.
- Após criar ou apagar um evento, responda com 1 frase curta confirmando.

Horário de atendimento:
- O expediente institucional é ${businessHoursDescription()}.
- Se o usuário pedir pra marcar FORA desse horário, avise ("esse horário está fora do expediente, quer manter mesmo assim?") e só chame create_event com force_outside_hours=true se ele confirmar.
- Dentro do horário, não precisa comentar.

Rótulo de relevância:
- Toda chamada de create_event exige o parâmetro relevance ("baixa", "media" ou "alta").
- Decida com base no contexto: reuniões rápidas de alinhamento geralmente são "baixa"; compromissos recorrentes de trabalho são "media"; defesas, provas, entregas críticas ou eventos com diretoria são "alta".
- Se o usuário indicar prioridade explicitamente ("urgente", "só pra marcar", "crítico"), respeite.
- Mencione o rótulo na frase de confirmação ao final (ex.: "Marquei a reunião com relevância alta.").`;
}

async function chatCompletion(env, body) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`OpenAI ${r.status}: ${text}`);
  }
  return r.json();
}

export const chatRouter = new Hono();
chatRouter.use('*', requireUser);

chatRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const { messages = [], userName = 'colaborador' } = await c.req.json().catch(() => ({}));

  if (!(await googleService.isConnected(c.env, userId))) {
    return c.json({ error: 'google_not_connected' }, 409);
  }

  if (!c.env.OPENAI_API_KEY) {
    return c.json({ error: 'A integração com a IA não está configurada.' }, 503);
  }

  const conversation = [{ role: 'system', content: systemPrompt(userName) }, ...messages];
  const toolsUsed = [];

  try {
    for (let i = 0; i < 6; i++) {
      const completion = await chatCompletion(c.env, {
        model: c.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: conversation,
        tools,
      });
      const choice = completion.choices[0].message;
      conversation.push(choice);

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        await logUsage(c.env, userId, 'chat_turn', {
          messagesIn: messages.length,
          toolsUsed,
          replyChars: (choice.content ?? '').length,
        });
        return c.json({ reply: choice.content ?? '', messages: stripSystem(conversation) });
      }

      for (const call of choice.tool_calls) {
        let result;
        try {
          const args = JSON.parse(call.function.arguments || '{}');
          result = await runTool(c.env, userId, call.function.name, args);
          toolsUsed.push(call.function.name);
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

    await logUsage(c.env, userId, 'chat_turn_exhausted', { toolsUsed });
    return c.json({
      reply: 'Desculpe, não consegui concluir a operação. Pode tentar de novo?',
      messages: stripSystem(conversation),
    });
  } catch (err) {
    console.error(err);
    await logUsage(c.env, userId, 'chat_error', { error: err?.message, toolsUsed });
    return c.json({ error: err.message || 'Erro interno do servidor.' }, 500);
  }
});

function stripSystem(conversation) {
  return conversation.filter((m) => m.role !== 'system');
}
