import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/templates/AuthLayout/AuthLayout.jsx';
import { Button } from '../components/atoms/Button/Button.jsx';
import { Input } from '../components/atoms/Input/Input.jsx';
import { FormField } from '../components/molecules/FormField/FormField.jsx';
import { api } from '../lib/api.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.forgotPassword({ email });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <form className="organism-auth-form" onSubmit={handleSubmit} noValidate>
        <header className="organism-auth-form__header">
          <h1 className="organism-auth-form__title">Esqueci minha senha</h1>
          <p className="organism-auth-form__subtitle">
            Informe seu email cadastrado. Vamos enviar um link para você criar uma nova senha.
          </p>
        </header>

        {done ? (
          <>
            <p className="organism-auth-form__success" style={{
              margin: '16px 0', padding: '12px 16px',
              background: '#f0fdf4', color: '#15803d',
              border: '1px solid rgba(21,128,61,0.2)', borderRadius: 10, fontSize: 13,
            }}>
              Se o email existir, você vai receber as instruções em alguns instantes. Confira também a pasta de spam.
            </p>
            <p className="organism-auth-form__footer">
              <Link to="/login">Voltar para o login</Link>
            </p>
          </>
        ) : (
          <>
            <FormField id="email" label="E-mail">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@fieb.org.br"
                autoComplete="email"
                required
              />
            </FormField>

            {error && <div className="organism-auth-form__error">{error}</div>}

            <Button type="submit" fullWidth disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar link de redefinição'}
            </Button>

            <p className="organism-auth-form__footer">
              Lembrou? <Link to="/login">Voltar para o login</Link>
            </p>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
