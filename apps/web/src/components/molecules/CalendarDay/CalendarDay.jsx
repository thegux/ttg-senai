import './CalendarDay.scss';

export function CalendarDay({ day, isToday, isSelected, isOtherMonth, eventCount, onClick }) {
  const classes = [
    'molecule-calendar-day',
    isToday && 'molecule-calendar-day--today',
    isSelected && 'molecule-calendar-day--selected',
    isOtherMonth && 'molecule-calendar-day--muted',
  ].filter(Boolean).join(' ');

  if (day == null) {
    return <div className="molecule-calendar-day molecule-calendar-day--empty" />;
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      <span className="molecule-calendar-day__number">{day}</span>
      {eventCount > 0 && (
        <span className="molecule-calendar-day__dots">
          {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
            <span key={i} className="molecule-calendar-day__dot" />
          ))}
        </span>
      )}
    </button>
  );
}
