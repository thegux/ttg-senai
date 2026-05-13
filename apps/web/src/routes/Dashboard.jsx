import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DashboardLayout } from '../components/templates/DashboardLayout/DashboardLayout.jsx';
import { useAuth } from '../lib/auth.jsx';
import './Dashboard.scss';

export function Dashboard() {
  const { user } = useAuth();
  const firstName = user.name.split(' ')[0];

  return (
    <DashboardLayout>
      <section className="page-dashboard">
        <h1 className="page-dashboard__title">Olá, {firstName}!</h1>
        <p className="page-dashboard__subtitle">
          Gerencie seus compromissos no Portal do Colaborador.
        </p>

        <div className="page-dashboard__cards">
          <Link to="/calendar" className="page-dashboard__card">
            <CalendarIcon size={32} />
            <h2>Calendário</h2>
            <p>Visualize e organize seus compromissos.</p>
          </Link>
        </div>
      </section>
    </DashboardLayout>
  );
}
