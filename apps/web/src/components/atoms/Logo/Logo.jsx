import './Logo.scss';

export function Logo({ variant = 'dark' }) {
  return (
    <div className={`atom-logo atom-logo--${variant}`}>
      <span className="atom-logo__mark">S</span>
      <span className="atom-logo__text">
        SENAI <strong>CIMATEC</strong>
      </span>
    </div>
  );
}
