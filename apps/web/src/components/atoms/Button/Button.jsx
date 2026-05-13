import './Button.scss';

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth = false,
  children,
  className = '',
  ...rest
}) {
  const classes = [
    'atom-button',
    `atom-button--${variant}`,
    `atom-button--${size}`,
    fullWidth && 'atom-button--full',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
