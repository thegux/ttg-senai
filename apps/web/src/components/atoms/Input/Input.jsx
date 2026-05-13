import { forwardRef } from 'react';
import './Input.scss';

export const Input = forwardRef(function Input(
  { invalid = false, className = '', ...rest },
  ref
) {
  const classes = [
    'atom-input',
    invalid && 'atom-input--invalid',
    className,
  ].filter(Boolean).join(' ');

  return <input ref={ref} className={classes} {...rest} />;
});
