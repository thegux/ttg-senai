import './AuthLayout.scss';

export function AuthLayout({ children }) {
  return (
    <div className="template-auth-layout">
      <div className="template-auth-layout__content">
        {children}
      </div>
    </div>
  );
}
