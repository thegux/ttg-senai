import { LogOut } from 'lucide-react';
import { Logo } from '../../atoms/Logo/Logo.jsx';
import { Button } from '../../atoms/Button/Button.jsx';
import './Header.scss';

export function Header({ user, onLogout }) {
  return (
    <header className="organism-header">
      <div className="organism-header__inner">
        <Logo variant="light" />
        <div className="organism-header__user">
          <div className="organism-header__welcome">
            <span className="organism-header__welcome-label">Bem-vindo,</span>
            <strong className="organism-header__welcome-name">{user.name}</strong>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="organism-header__logout">
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
