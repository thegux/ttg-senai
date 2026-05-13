import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths, endOfMonth, format, isSameDay, startOfMonth, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '../../atoms/Button/Button.jsx';
import { CalendarDay } from '../../molecules/CalendarDay/CalendarDay.jsx';
import './CalendarGrid.scss';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarGrid({ month, onMonthChange, events, selectedDate, onSelectDate }) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const daysInMonth = monthEnd.getDate();
  const startWeekday = monthStart.getDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const today = new Date();
  const eventsByDay = events.reduce((acc, event) => {
    const key = format(new Date(event.startsAt), 'yyyy-MM-dd');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  function dateFor(day) {
    return new Date(month.getFullYear(), month.getMonth(), day);
  }

  return (
    <section className="organism-calendar-grid">
      <header className="organism-calendar-grid__header">
        <h2 className="organism-calendar-grid__title">
          {format(month, "LLLL 'de' yyyy", { locale: ptBR })}
        </h2>
        <div className="organism-calendar-grid__nav">
          <Button variant="outline" size="sm" onClick={() => onMonthChange(subMonths(month, 1))}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </header>

      <div className="organism-calendar-grid__weekdays">
        {WEEKDAYS.map((label) => (
          <div key={label} className="organism-calendar-grid__weekday">{label}</div>
        ))}
      </div>

      <div className="organism-calendar-grid__days">
        {cells.map((day, index) => {
          if (day == null) {
            return <CalendarDay key={`empty-${index}`} day={null} />;
          }
          const date = dateFor(day);
          const key = format(date, 'yyyy-MM-dd');
          return (
            <CalendarDay
              key={key}
              day={day}
              isToday={isSameDay(date, today)}
              isSelected={selectedDate ? isSameDay(date, selectedDate) : false}
              eventCount={eventsByDay[key] ?? 0}
              onClick={() => onSelectDate(date)}
            />
          );
        })}
      </div>
    </section>
  );
}
