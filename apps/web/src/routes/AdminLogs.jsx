import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardLayout } from '../components/templates/DashboardLayout/DashboardLayout.jsx';
import { Button } from '../components/atoms/Button/Button.jsx';
import { api } from '../lib/api.js';
import './AdminLogs.scss';

const ACTION_FILTERS = [
  { value: '',                         label: 'Todas' },
  { value: 'login',                    label: 'Login' },
  { value: 'login_failed',             label: 'Login falho' },
  { value: 'signup',                   label: 'Cadastro' },
  { value: 'logout',                   label: 'Logout' },
  { value: 'password_reset_requested', label: 'Reset solicitado' },
  { value: 'password_reset_completed', label: 'Reset concluído' },
  { value: 'google_connected',         label: 'Google conectado' },
  { value: 'google_disconnected',      label: 'Google desconectado' },
  { value: 'event_created',            label: 'Evento criado' },
  { value: 'event_deleted',            label: 'Evento apagado' },
  { value: 'chat_turn',                label: 'Chat TIA' },
];

export function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ logs }, { stats }] = await Promise.all([
        api.adminLogs({ limit: 500, action: action || undefined }),
        api.adminStats(),
      ]);
      setLogs(logs);
      setStats(stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <section className="page-admin-logs">
        <header className="page-admin-logs__head">
          <div>
            <h1 className="page-admin-logs__title">Logs de uso</h1>
            <p className="page-admin-logs__subtitle">
              Últimas 500 ações registradas. Visível apenas para administradores.
            </p>
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? 'Atualizando…' : 'Atualizar'}
          </Button>
        </header>

        {stats.length > 0 && (
          <section className="page-admin-logs__stats">
            <h2 className="page-admin-logs__h2">Resumo (últimos 30 dias)</h2>
            <div className="page-admin-logs__stat-grid">
              {stats.map((s) => (
                <div key={s.action} className="page-admin-logs__stat">
                  <span className="page-admin-logs__stat-value">{s.count}</span>
                  <span className="page-admin-logs__stat-label">{s.action}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="page-admin-logs__filters">
          <label htmlFor="action-filter">Filtrar por ação:</label>
          <select
            id="action-filter"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            {ACTION_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && <p className="page-admin-logs__error">{error}</p>}

        <div className="page-admin-logs__table-wrap">
          <table className="page-admin-logs__table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ação</th>
                <th>Usuário</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !loading && (
                <tr><td colSpan={4} className="page-admin-logs__empty">Nenhum registro.</td></tr>
              )}
              {logs.map((row) => (
                <tr key={row.id}>
                  <td className="page-admin-logs__when">
                    {format(new Date(row.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                  </td>
                  <td>
                    <code className="page-admin-logs__action">{row.action}</code>
                  </td>
                  <td>
                    {row.email ? (
                      <>
                        <div>{row.name}</div>
                        <div className="page-admin-logs__email">{row.email}</div>
                      </>
                    ) : (
                      <span className="page-admin-logs__email">—</span>
                    )}
                  </td>
                  <td>
                    {row.metadata ? (
                      <pre className="page-admin-logs__meta">
                        {JSON.stringify(row.metadata, null, 2)}
                      </pre>
                    ) : <span className="page-admin-logs__email">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
