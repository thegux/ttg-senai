import { Clock, MapPin, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../../atoms/Button/Button.jsx';
import './EventCard.scss';

const RELEVANCE_LABEL = {
  baixa: 'Baixa',
  media: 'Média',
  alta:  'Alta',
};

export function EventCard({ event, onDelete }) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const time = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm', { locale: ptBR })}`;
  const relevance = event.relevance; // 'baixa' | 'media' | 'alta' | null

  return (
    <article
      className={`molecule-event-card ${relevance ? `molecule-event-card--rel-${relevance}` : ''}`}
    >
      <div className="molecule-event-card__header">
        <div className="molecule-event-card__title-wrap">
          <h4 className="molecule-event-card__title">{event.title}</h4>
          {relevance && (
            <span
              className={`molecule-event-card__badge molecule-event-card__badge--${relevance}`}
              title={`Relevância ${RELEVANCE_LABEL[relevance]}`}
            >
              {RELEVANCE_LABEL[relevance]}
            </span>
          )}
        </div>
        {onDelete && (
          <Button variant="danger" size="sm" onClick={() => onDelete(event.id)} aria-label="Remover">
            <Trash2 size={14} />
          </Button>
        )}
      </div>
      <p className="molecule-event-card__meta">
        <Clock size={14} /> {time}
      </p>
      {event.location && (
        <p className="molecule-event-card__meta">
          <MapPin size={14} /> {event.location}
        </p>
      )}
      {event.description && (
        <p className="molecule-event-card__description">{event.description}</p>
      )}
    </article>
  );
}
