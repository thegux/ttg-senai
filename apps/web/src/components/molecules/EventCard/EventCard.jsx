import { Clock, MapPin, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../../atoms/Button/Button.jsx';
import './EventCard.scss';

export function EventCard({ event, onDelete }) {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const time = `${format(start, 'HH:mm')} – ${format(end, 'HH:mm', { locale: ptBR })}`;

  return (
    <article className="molecule-event-card">
      <div className="molecule-event-card__header">
        <h4 className="molecule-event-card__title">{event.title}</h4>
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
