import './Label.scss';

export function Label({ htmlFor, children, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`atom-label ${className}`}>
      {children}
    </label>
  );
}
