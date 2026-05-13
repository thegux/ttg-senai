import { NavLink } from 'react-router-dom';
import { Home, Calendar } from 'lucide-react';
import './Sidebar.scss';

const items = [
  { to: '/',         label: 'Início',     Icon: Home },
  { to: '/calendar', label: 'Calendário', Icon: Calendar },
];

export function Sidebar() {
  return (
    <nav className="organism-sidebar">
      <ul className="organism-sidebar__list">
        {items.map(({ to, label, Icon }) => (
          <li key={to} className="organism-sidebar__item">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'organism-sidebar__link organism-sidebar__link--active'
                  : 'organism-sidebar__link'
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
