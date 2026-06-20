import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../atoms/Button/Button.jsx';
import { Input } from '../../atoms/Input/Input.jsx';
import { FormField } from '../../molecules/FormField/FormField.jsx';
import './AuthForm.scss';

export function AuthForm({ mode, onSubmit }) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit(isSignup ? { name, email, password } : { email, password });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="organism-auth-form" onSubmit={handleSubmit} noValidate>
      <header className="organism-auth-form__header">
        <h1 className="organism-auth-form__title">
          {isSignup ? 'Criar conta' : 'Portal do Colaborador'}
        </h1>
        <p className="organism-auth-form__subtitle">
          {isSignup
            ? 'Preencha seus dados para começar'
            : 'Entre com suas credenciais para acessar o sistema'}
        </p>
      </header>

      {isSignup && (
        <FormField id="name" label="Nome completo">
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Maria Silva"
            autoComplete="name"
            required
          />
        </FormField>
      )}

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

      <FormField
        id="password"
        label="Senha"
        hint={isSignup ? 'Mínimo de 8 caracteres' : undefined}
      >
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          minLength={isSignup ? 8 : undefined}
          required
        />
      </FormField>

      {error && <div className="organism-auth-form__error">{error}</div>}

      <Button type="submit" fullWidth disabled={busy}>
        {busy ? 'Aguarde…' : isSignup ? 'Criar conta' : 'Entrar'}
      </Button>

      {!isSignup && (
        <p className="organism-auth-form__forgot">
          <Link to="/forgot-password">Esqueci minha senha</Link>
        </p>
      )}

      <p className="organism-auth-form__footer">
        {isSignup ? (
          <>Já possui conta? <Link to="/login">Entrar</Link></>
        ) : (
          <>Novo por aqui? <Link to="/signup">Criar conta</Link></>
        )}
      </p>
    </form>
  );
}
