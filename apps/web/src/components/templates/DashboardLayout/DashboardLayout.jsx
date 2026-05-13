import { Header } from '../../organisms/Header/Header.jsx';
import { Sidebar } from '../../organisms/Sidebar/Sidebar.jsx';
import { useAuth } from '../../../lib/auth.jsx';
import './DashboardLayout.scss';

export function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="template-dashboard-layout">
      <Header user={user} onLogout={logout} />
      <div className="template-dashboard-layout__body">
        <Sidebar />
        <main className="template-dashboard-layout__main">{children}</main>
      </div>
    </div>
  );
}
