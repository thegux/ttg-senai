import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { Login } from './routes/Login.jsx';
import { Signup } from './routes/Signup.jsx';
import { Dashboard } from './routes/Dashboard.jsx';
import { Calendar } from './routes/Calendar.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login"  element={<RedirectIfAuthed><Login  /></RedirectIfAuthed>} />
      <Route path="/signup" element={<RedirectIfAuthed><Signup /></RedirectIfAuthed>} />
      <Route path="/"         element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><Calendar  /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
