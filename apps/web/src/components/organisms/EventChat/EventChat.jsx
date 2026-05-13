import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User as UserIcon } from 'lucide-react';
import { Button } from '../../atoms/Button/Button.jsx';
import { Input } from '../../atoms/Input/Input.jsx';
import { api } from '../../../lib/api.js';
import './EventChat.scss';

const SUGGESTIONS = [
  'Quais meus compromissos hoje?',
  'Agendar reunião amanhã às 14h por 1 hora',
  'Tenho horário livre na quinta de manhã?',
];

export function EventChat({ userName, onEventsChanged }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text) {
    if (!text.trim() || busy) return;
    setError('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const { reply, messages: updated } = await api.chat({
        userName,
        messages: next.map(({ role, content }) => ({ role, content })),
      });
      const visible = updated.filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content));
      setMessages(visible);
      if (reply) onEventsChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="organism-event-chat">
      <header className="organism-event-chat__header">
        <div className="organism-event-chat__avatar"><Bot size={18} /></div>
        <div>
          <h3 className="organism-event-chat__title">TIA — Assistente Virtual</h3>
          <p className="organism-event-chat__subtitle">Converse para agendar e checar conflitos</p>
        </div>
      </header>

      <div className="organism-event-chat__messages">
        {messages.length === 0 && (
          <div className="organism-event-chat__suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="organism-event-chat__chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`organism-event-chat__message organism-event-chat__message--${m.role}`}
          >
            <div className="organism-event-chat__bubble-avatar">
              {m.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
            </div>
            <div className="organism-event-chat__bubble">{m.content}</div>
          </div>
        ))}

        {busy && (
          <div className="organism-event-chat__message organism-event-chat__message--assistant">
            <div className="organism-event-chat__bubble-avatar"><Bot size={14} /></div>
            <div className="organism-event-chat__bubble organism-event-chat__bubble--typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {error && <p className="organism-event-chat__error">{error}</p>}

      <form
        className="organism-event-chat__input-row"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: agendar reunião sexta às 10h"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()} aria-label="Enviar">
          <Send size={16} />
        </Button>
      </form>
    </section>
  );
}
