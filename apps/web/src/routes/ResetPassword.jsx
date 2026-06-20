import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/templates/AuthLayout/AuthLayout.jsx';
import { Button } from '../components/atoms/Button/Button.jsx';
import { Input } from '../components/atoms/Input/Input.jsx';
import { FormField } from '../components/molecules/FormField/FormField.jsx';
import { api } from '../lib/api.js';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      return setError('A senha precisa ter pelo menos 8 caracteres.');
    }
    if (password !== confirm) {
      return setError('As senhas não conferem.');
    }
    setBusy(true);
    try {
      await api.resetPassword({ token, password });
      navigate('/login', { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="organism-auth-form">
          <header className="organism-auth-form__header">
            <h1 className="organism-auth-form__title">Link inválido</h1>
            <p className="organism-auth-form__subtitle">
              O link de redefinição não está completo ou está corrompido.
              Peça um novo na página de "esqueci minha senha".
            </p>
          </header>
          <p className="organism-auth-form__footer">
            <Link to="/forgot-password">Pedir novo link</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="organism-auth-form" onSubmit={handleSubmit} noValidate>
        <header className="organism-auth-form__header">
          <h1 className="organism-auth-form__title">Definir nova senha</h1>
          <p className="organism-auth-form__subtitle">Escolha uma senha de pelo menos 8 caracteres.</p>
        </header>

        <FormField id="password" label="Nova senha">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </FormField>

        <FormField id="confirm" label="Confirmar nova senha">
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </FormField>

        {error && <div className="organism-auth-form__error">{error}</div>}

        <Button type="submit" fullWidth disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar nova senha'}
        </Button>

        <p className="organism-auth-form__footer">
          <Link to="/login">Voltar para o login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
