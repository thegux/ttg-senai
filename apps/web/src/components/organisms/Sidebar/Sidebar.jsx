import { NavLink } from 'react-router-dom';
import { Home, Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../lib/auth.jsx';
import './Sidebar.scss';

const items = [
  { to: '/',         label: 'Início',     Icon: Home },
  { to: '/calendar', label: 'Calendário', Icon: Calendar },
];

export function Sidebar() {
  const { user } = useAuth();
  const visible = user?.role === 'admin'
    ? [...items, { to: '/admin/logs', label: 'Logs', Icon: ShieldCheck }]
    : items;
  return (
    <nav className="organism-sidebar">
      <ul className="organism-sidebar__list">
        {visible.map(({ to, label, Icon }) => (
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
