import { AuthLayout } from '../components/templates/AuthLayout/AuthLayout.jsx';
import { AuthForm } from '../components/organisms/AuthForm/AuthForm.jsx';
import { useAuth } from '../lib/auth.jsx';

export function Login() {
  const { login } = useAuth();
  return (
    <AuthLayout>
      <AuthForm mode="login" onSubmit={login} />
    </AuthLayout>
  );
}
