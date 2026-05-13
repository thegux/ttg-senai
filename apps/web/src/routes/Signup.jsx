import { AuthLayout } from '../components/templates/AuthLayout/AuthLayout.jsx';
import { AuthForm } from '../components/organisms/AuthForm/AuthForm.jsx';
import { useAuth } from '../lib/auth.jsx';

export function Signup() {
  const { signup } = useAuth();
  return (
    <AuthLayout>
      <AuthForm mode="signup" onSubmit={signup} />
    </AuthLayout>
  );
}
