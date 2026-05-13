import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfMonth, isSameDay, startOfMonth } from 'date-fns';
import { DashboardLayout } from '../components/templates/DashboardLayout/DashboardLayout.jsx';
import { CalendarGrid } from '../components/organisms/CalendarGrid/CalendarGrid.jsx';
import { EventChat } from '../components/organisms/EventChat/EventChat.jsx';
import { EventCard } from '../components/molecules/EventCard/EventCard.jsx';
import { GoogleConnect } from '../components/organisms/GoogleConnect/GoogleConnect.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import './Calendar.scss';

export function Calendar() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.googleStatus()
      .then(({ connected }) => setConnected(connected))
      .catch(() => setConnected(false));
  }, []);

  const loadEvents = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError('');
    try {
      const from = startOfMonth(month).toISOString();
      const to   = endOfMonth(month).toISOString();
      const { events } = await api.listEvents(from, to);
      setEvents(events);
    } catch (err) {
      if (err.code === 'google_not_connected') setConnected(false);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connected, month]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const eventsForSelectedDay = useMemo(
    () => events.filter((e) => e.startsAt && isSameDay(new Date(e.startsAt), selectedDate)),
    [events, selectedDate]
  );

  async function handleDelete(id) {
    await api.deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  if (connected === null) {
    return <DashboardLayout><p className="page-calendar__status">Carregando…</p></DashboardLayout>;
  }

  if (!connected) {
    return (
      <DashboardLayout>
        <GoogleConnect onConnected={() => setConnected(true)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-calendar">
        <div className="page-calendar__left">
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <section className="page-calendar__day">
            <h3 className="page-calendar__day-title">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {eventsForSelectedDay.length === 0
              ? <p className="page-calendar__empty">Nenhum compromisso nesta data.</p>
              : eventsForSelectedDay.map((event) => (
                  <EventCard key={event.id} event={event} onDelete={handleDelete} />
                ))}
          </section>

          {loading && <p className="page-calendar__status">Atualizando…</p>}
          {error && <p className="page-calendar__status page-calendar__status--error">{error}</p>}
        </div>

        <EventChat userName={user.name} onEventsChanged={loadEvents} />
      </div>
    </DashboardLayout>
  );
}
