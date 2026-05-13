import { Label } from '../../atoms/Label/Label.jsx';
import './FormField.scss';

export function FormField({ id, label, error, children, hint }) {
  return (
    <div className="molecule-form-field">
      {label && <Label htmlFor={id}>{label}</Label>}
      {children}
      {error
        ? <p className="molecule-form-field__error">{error}</p>
        : hint && <p className="molecule-form-field__hint">{hint}</p>}
    </div>
  );
}
